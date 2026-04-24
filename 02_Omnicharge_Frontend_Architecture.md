# 02_Omnicharge_Frontend_Architecture

## 1. Modular Architecture Strategy

**Decision**: **Standalone Components (100%)**
Angular 17+ heavily promotes Standalone Components, virtually eliminating the need for `NgModules`. 
- **Simpler Dependency Management**: Each component imports exactly what it needs (e.g., `MatButtonModule`, `CommonModule`, specific services).
- **Reduced Bundle Size**: Tree-shaking is far more efficient when components don't drag in entire bloated `SharedModules`.

## 2. Deferred Authentication & Security Infrastructure

The User Journey now requires Guest Browsing. Users interact with the app, select a plan, and are ONLY interrupted by a login screen when they attempt checkout.

### A. Deferred Login State Preservation
When an unauthenticated user clicks "Proceed to Pay" with a selected plan:
1. The `RechargeSignalStore` saves the `mobileNumber`, `operatorId`, and the selected `PlanResponse` temporarily in `sessionStorage` (to survive page redirects, especially for Google OAuth 2.0).
2. The user is redirected to `/auth/login?returnUrl=/recharge/checkout`.
3. They log in manually OR use Google OAuth 2.0.
4. If OAuth is used, the backend redirects them back to the frontend with an access token (usually via passing it in the URL fragment or a secure cookie).
5. The frontend extracts the token, stores it, retrieves the preserved recharge data from `sessionStorage`, and pushes the user directly to `/recharge/checkout`.

### B. Auth Guards (`CanActivateFn`)
- `authGuard`: Protects `/recharge/checkout`, `/dashboard`, etc. Checks the SignalStore/localStorage for an active JWT. If missing, captures the intended URL and redirects to `login?returnUrl={current_path}`.
- `adminGuard`: Protects `/admin/**`. Decodes the JWT payload to ensure `role === 'ROLE_ADMIN'`. If false, redirects to `dashboard`.

### C. HTTP Interceptors
Using `HttpInterceptorFn`:
- **AuthInterceptor**: Injects the `Authorization: Bearer <token>` header on all requests matching `environment.apiGatewayUrl` EXCEPT those explicitly marked public (e.g. `/api/auth/**`, `/api/operators/**`).
- **RefreshInterceptor**: Replays requests transparently on `401` after fetching a new access token via `POST /api/auth/refresh-token`.

## 3. Frontend Strategy for Backend SAGA Orchestration (Razorpay)

The OMNICHARGE backend utilizes RabbitMQ to decouple the `RechargeService` and `PaymentService`. Because of this async architecture, the frontend must act as the bridge to complete the Razorpay flow.

### The Asynchronous Checkout Flow
1. **Initiate Recharge:** The *now authenticated* user confirms the targeted mobile number and plan on the Checkout screen. The UI calls `POST /api/recharges`. The backend responds *immediately* with `status: PROCESSING` and a `rechargeId`. It does *not* return the Razorpay Order ID.
2. **Polling the Payment Service:** Behind the scenes, the SAGA consumer in `PaymentService` creates the Razorpay Order. The frontend must display a "Generating Secure Checkout..." spinner and poll the `GET /api/payments/history` looking for a `PENDING` transaction matching the `rechargeId`.
3. **Triggering Razorpay Modal:** Once the frontend retrieves the `TransactionResponse` containing the `razorpayOrderId`, it injects the Razorpay Checkout script (`https://checkout.razorpay.com/v1/checkout.js`) and opens the payment modal.
4. **Manual Confirmation:** Upon successful payment in the modal, Razorpay calls the frontend's success callback with `razorpay_payment_id` and `razorpay_signature`.
5. **Closing the Loop:** The frontend immediately posts these details to `POST /api/payments/webhook/confirm/{transactionId}`.
6. **SAGA Completion:** The backend verifies the payment, updates the transaction to `SUCCESS`, fires RabbitMQ events to update the Recharge status to `SUCCESS`, and triggers Email/SMS notifications.
