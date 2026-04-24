# 01_Omnicharge_Backend_Analysis_&_Tooling

## 1. Backend Architecture & Flow Summary

Based on a deep analysis of the active OMNICHARGE platform, the backend operates as a decoupled microservices architecture (Spring Boot 3.5.x, Java 21) containing 9 distinct services. All external communication routes exclusively through the **API Gateway** (`localhost:8080`).

### A. Deferred Authentication & Guest User Journey
The platform is transitioning to a **Guest-First** approach. Users will browse operators, compare plans, and initiate the recharge context *without* being forced to log in upfront. 
- **Trigger Point:** The authentication wall (Manual or Google OAuth 2.0) is deferred until the exact moment the user clicks "Proceed to Pay" or "Recharge Now".
- **State Preservation:** The frontend must temporarily store the selected `PlanResponse` and target `mobileNumber` in a session/local storage or NgRx State, redirecting back to the checkout flow post-login.

### B. Exact Endpoint Security Mapping
Below is the definitive mapping of Public vs. Protected endpoints extracted directly from the microservice `SecurityConfig` files:

#### ✅ PUBLIC ENDPOINTS (No Token Needed)
- `POST /api/auth/register` (user-service)
- `POST /api/auth/login` (user-service)
- `POST /api/auth/refresh-token` (user-service)
- `GET /api/auth/oauth2/google/url` (user-service)
- `GET /api/auth/oauth2/google/callback` (user-service)
- `GET /api/operators/detect?mobileNumber=...` (operator-service)
- `GET /api/operators/active` (operator-service)
- `GET /api/operators/{id}` (operator-service)
- `GET /api/plans/{id}` (operator-service)
- *NOTE: `GET /api/plans/search` is currently marked as Protected in the backend `SecurityConfig`. To fully support the Guest Plan Browsing feature, the backend MUST be updated to allow `permitAll()` on this route.*

#### 🔒 PROTECTED ENDPOINTS (Requires `Authorization: Bearer <token>`)
- `GET /api/plans/search` (Currently protected, needs public access)
- `POST /api/recharges` (recharge-service)
- `GET /api/recharges/history` (recharge-service)
- `POST /api/payments/process` (payment-service)
- `GET /api/payments/history` (payment-service)
- `POST /api/payments/webhook/confirm/{transactionId}` (payment-service)
- `GET /api/users/me` (user-service)
- `PUT /api/users/me` (user-service)

### C. Asynchronous SAGA & Razorpay Handling
The platform uses RabbitMQ for orchestration. 
- `POST /api/recharges` returns immediately with a `PROCESSING` status.
- Through RabbitMQ, `PaymentService` asynchronously catches the event and generates a `razorpayOrderId` mapped to a `PENDING` Transaction.
- The payment requires a manual confirmation webhook (`POST /api/payments/webhook/confirm/{transactionId}`) after the client-side Razorpay checkout completes.

---

## 2. Frontend Tooling & DX Decisions

To build an enterprise-grade Angular platform that aligns seamlessly with this robust backend and prioritizes implementation simplicity over SSR/SEO, the following tooling and architectural decisions are recommended:

### A. Application Path: Pure SPA (Single Page Application)
**Decision:** **100% Client-Side Rendering (CSR)**  
As per project constraints, SEO is no longer a requirement. A pure SPA streamlines development, deployment, and authentication flows without hydration mechanics.

### B. State Management
**Decision:** **NgRx SignalStore + RxJS**  
We will use NgRx SignalStore for managing transient states like the `Recharge Flow` (Mobile Number -> Operator -> Plan -> Deferred Login -> Payment). RxJS is kept strictly for HTTP API calls, specifically polling the `PaymentService` to retrieve the `razorpayOrderId`.

### C. Build Tools & HMR
**Decision:** **Esbuild (Vite-based Dev Server)**  
Angular 17+ defaults to the `esbuild` and `vite` builder, handling Hot Module Replacement (HMR) seamlessly out of the box.
