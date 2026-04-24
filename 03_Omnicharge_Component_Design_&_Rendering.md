# 03_Omnicharge_Component_Design_&_Rendering

## 1. Professional Component Blueprint & API Mapping

To ensure absolute precision, every frontend component is strictly mapped to the exact Java backend DTOs and API Endpoints. We enforce a strict **Container/Presentational (Smart vs. Dumb)** component architecture.

### A. Smart Components (Containers)
**Responsibilities:** 
- Injects Angular Services and NgRx SignalStores.
- Triggers HTTP Calls to the API Gateway.
- Passes Data DOWN to Dumb Components via `@Input()`.
- Catches Events UP from Dumb Components via `@Output()`.

### B. Dumb Components (Presentational)
**Responsibilities:** 
- Uses `ChangeDetectionStrategy.OnPush` strictly.
- Contains NO service injections (except maybe stateless formatters).
- Renders the UI (HTML/Tailwind) based on Inputs.

---

## 2. Global Component Hierarchy & DTO Mapping

```text
AppComponent (Root)
├── TopbarComponent (SMART)
│   └─ Data: Reads Auth SignalStore (JWT User Payload).
│
├── PublicFlow/ (Lazy Loaded, No Auth)
│   ├── LandingPageComponent (SMART)
│   │   ├── QuickRechargeWidgetComponent (DUMB)
│   │   │   └─ Output: (mobileNumber: string)
│   │   └── OperatorDetectionComponent (SMART)
│   │       ├─ API: GET /api/operators/detect?mobileNumber={num}
│   │       ├─ DTO: OperatorDetectionResponse { networkType, circle, operatorName, operatorId }
│   │       └─ Output: Proceeds to PlanBrowser.
│   │
│   └── PlanBrowserComponent (SMART)
│       ├─ API: GET /api/plans/search?operatorId={id} (Requires Backend to set as permitAll())
│       ├─ DTO: Page<PlanResponse> { id, planName, price, dataLimit, validityDays, category }
│       ├── PlanFiltersComponent (DUMB) - Tabs for Category filtering
│       └── PlanCardComponent (DUMB)
│           ├─ Input: PlanResponse
│           └─ Output: (planId) -> Triggers "Deferred Auth Check"
│
├── AuthFlow/ (Lazy Loaded)
│   ├── LoginComponent (SMART)
│   │   ├─ API: POST /api/auth/login
│   │   ├─ DTO: LoginRequest { email, password } -> AuthResponse { token, refreshToken, role }
│   │   └─ Logic: Checks `returnUrl` in query params. Restores session state if returning from deferred login.
│   └── GoogleOAuthRedirectComponent (SMART)
│       └─ Logic: Catches the Google callback, parses token from URL, checks `sessionStorage` for preserved plan, redirects to checkout.
│
├── CheckoutFlow/ (Lazy Loaded, Protected by AuthGuard)
│   ├── CheckoutSummaryComponent (SMART)
│   │   ├─ State: Hydrates Mobile Number, Operator, and PlanResponse from SignalStore.
│   │   ├─ API 1: POST /api/recharges
│   │   │  ├─ Request DTO: RechargeRequest { mobileNumber, operatorId, planId, paymentMethod }
│   │   │  └─ Response DTO: RechargeResponse { rechargeId, status: "PROCESSING" }
│   │   ├─ API 2: GET /api/payments/history?rechargeId={id} (Polling)
│   │   │  └─ Response DTO: Page<TransactionResponse> { transactionId, razorpayOrderId, status }
│   │   └── RazorpayModalIntegration (Logic Hook)
│   │       ├─ API 3: POST /api/payments/webhook/confirm/{transactionId}
│   │       └─ Logic: Submits razorpay_payment_id and razorpay_signature.
│   │
│   └── ReceiptComponent (DUMB)
│       └─ Input: TransactionResponse / RechargeResponse summary.
│
└── UserDashboard/ (Lazy Loaded, Protected by AuthGuard)
    ├── RechargeHistoryComponent (SMART)
    │   ├─ API: GET /api/recharges/history
    │   ├─ DTO: Page<RechargeResponse>
    │   └── HistoryTableComponent (DUMB) -> Uses Angular Material Table
    └── ProfileSettingsComponent (SMART)
        ├─ API: GET /api/users/me -> UserProfileResponse
        └─ API: PUT /api/users/me -> UserProfileUpdateRequest
```

## 3. State & Rendering Strategy

### ChangeDetectionStrategy.OnPush
**Rule:** Every presentational (dumb) component MUST use `ChangeDetectionStrategy.OnPush`.
- Components like `PlanCardComponent`, `HistoryTableComponent`, and `QuickRechargeWidgetComponent` only rely on `@Input()` data. By forcing `OnPush`, Angular completely skips checking these branches during the Change Detection cycle unless their exact reference changes.
- In `PlanBrowserComponent`, when paginating or filtering the `Page<PlanResponse>`, returning a new Array reference natively triggers `OnPush` updates quickly.

### State Management via SignalStore
To securely and reliably handle the **Deferred Auth Journey**, we will implement a `RechargeFlowStore` using `@ngrx/signals`:

```typescript
// Conceptual State Shape
interface RechargeState {
   targetMobileNumber: string | null;
   detectedOperator: OperatorDetectionResponse | null;
   selectedPlan: PlanResponse | null;
   rechargeStatus: 'IDLE' | 'PROCESSING' | 'AWAITING_PAYMENT' | 'SUCCESS' | 'FAILED';
}
```
**Mechanism:** 
When the guest clicks a `PlanCardComponent` (Dumb), the `PlanBrowserComponent` (Smart) patches the `RechargeFlowStore`. 
The application then asks the `AuthStore`: *Is the user logged in?*
- If **Yes**: Route directly to `/checkout`.
- If **No**: The `RechargeFlowStore` calls an `effect()` to serialize its state into `sessionStorage`. The router sends the user to `/auth/login?returnUrl=/checkout`. Upon successful login (Manual or Google OAuth), an `initializer` hook in the `RechargeFlowStore` hydrates the state from `sessionStorage` and fulfills the redirect.
