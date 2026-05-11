# OmniCharge Frontend - Comprehensive Architecture Guide

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Architecture Layers](#core-architecture-layers)
5. [Authentication & Authorization](#authentication--authorization)
6. [Services Breakdown](#services-breakdown)
7. [Data Models](#data-models)
8. [Component Hierarchy](#component-hierarchy)
9. [User Flows](#user-flows)
10. [Error Handling](#error-handling)
11. [Caching Strategy](#caching-strategy)
12. [Mock API System](#mock-api-system)

---

## 🎯 Project Overview

**OmniCharge Frontend** is a modern Angular 21+ standalone component-based application that provides:

- 📱 Mobile recharge services (Phone OTP authentication)
- 💳 Razorpay payment integration
- 📊 Admin dashboard for system management
- 🔔 Real-time notifications
- 👤 User profile management
- 📈 Recharge history tracking

**Key Features:**

- Zoneless change detection (no NgZone)
- Functional routing with lazy loading
- Standalone components exclusively
- Material Design UI
- Mock API support for development

---

## 🛠 Technology Stack

**Core Framework:**

- **Angular 21.2.5** - Standalone components, functional routing
- **TypeScript 5.9.2** - Strong typing
- **RxJS 7.8.0** - Reactive programming

**UI Framework:**

- **Angular Material 21.2.3** - Components (Toolbar, Sidenav, Cards, etc.)
- **Angular CDK 21.2.3** - Layout utilities

**HTTP & State:**

- **Angular HttpClient** - HTTP interceptors for auth & responses
- **RxJS Observables** - Reactive state with BehaviorSubject

**Build & Testing:**

- **Angular CLI 21.2.3**
- **Karma** - Test runner
- **Jasmine** - Testing framework

**DevOps:**

- **Docker** - Containerization
- **Nginx** - Production server
- **Prettier** - Code formatting
- **SonarQube** - Code quality

---

## 📁 Project Structure

```
src/
├── main.ts                           # Bootstrap entry point
├── index.html                        # HTML template
├── styles.scss                       # Global styles
├── app/
│   ├── app.ts                       # Root component (RouterOutlet)
│   ├── app.config.ts                # AppConfig with providers
│   ├── app.routes.ts                # Routing definitions
│   ├── core/
│   │   ├── guards/                  # Route guards
│   │   │   ├── auth.guard.ts        # Authentication check
│   │   │   ├── admin.guard.ts       # Admin role check
│   │   │   └── unsaved-changes.guard.ts
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts  # Token attachment + 401 refresh
│   │   │   └── response.interceptor.ts  # Response unwrapping + error routing
│   │   ├── services/
│   │   │   ├── auth.service.ts      # Phone OTP, Google Auth, token mgmt
│   │   │   ├── user.service.ts      # Profile operations
│   │   │   ├── operator.service.ts  # Operator detection, plans
│   │   │   ├── recharge.service.ts  # Recharge initiation & tracking
│   │   │   ├── payment.service.ts   # Razorpay integration
│   │   │   ├── notification.service.ts  # Notifications
│   │   │   ├── cache.service.ts     # TTL-based caching
│   │   │   └── mock-data.ts         # Mock data for dev
│   │   ├── models/
│   │   │   ├── user.model.ts        # User, Auth DTOs
│   │   │   ├── operator.model.ts    # Operator, Plan
│   │   │   ├── recharge.model.ts    # Recharge, Transaction
│   │   │   └── notification.model.ts
│   │   └── layouts/
│   │       ├── user-layout/         # Main authenticated layout
│   │       └── admin-layout/        # Admin-only layout
│   └── features/
│       ├── welcome/                 # Splash screen
│       ├── landing/                 # Mobile + Operator detection
│       ├── auth/
│       │   ├── login/               # Phone OTP login
│       │   ├── register/
│       │   └── forgot-password/
│       ├── dashboard/               # User dashboard
│       ├── recharge/                # Recharge workflow (3-step saga)
│       ├── profile/                 # User profile edit
│       ├── history/                 # Recharge history
│       ├── notifications/           # Notification center
│       ├── admin/                   # Admin dashboard
│       └── errors/
│           ├── not-found.component.ts      # 404
│           ├── forbidden.component.ts      # 403
│           └── server-error.component.ts   # 500+
├── environments/
│   ├── environment.ts               # Dev config (useMockApi: true)
│   └── environment.prod.ts          # Prod config
└── proxy.conf.json                  # Dev proxy for CORS
```

---

## 🏗 Core Architecture Layers

### 1. **Bootstrap Layer** (`main.ts` → `app.config.ts`)

```typescript
// main.ts
bootstrapApplication(AppComponent, appConfig);

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(), // Modern angular, no NgZone
    provideRouter(routes), // Functional routing
    provideAnimationsAsync(), // Material animations
    provideHttpClient(
      withInterceptors([
        // HTTP interceptors
        authInterceptor,
        responseInterceptor,
      ]),
    ),
  ],
};
```

**Key Points:**

- ✅ Zoneless change detection for better performance
- ✅ Standalone-first (no NgModules)
- ✅ Functional providers pattern

### 2. **Routing Layer** (`app.routes.ts`)

```typescript
Routes structure:
│
├── "/" (Welcome)                          [Public]
├── "/recharge-home" (Landing)             [Public]
├── "/auth/*"
│   ├── "/auth/login"                     [Public - Phone OTP]
│   ├── "/auth/register"                  [Public]
│   └── "/auth/forgot-password"           [Public]
├── "/error/*"
│   ├── "/error/403"                      [Error Page]
│   ├── "/error/404"                      [Error Page]
│   └── "/error/500"                      [Error Page]
│
├── "/***" (UserLayoutComponent)          [Protected by authGuard]
│   ├── "/dashboard"
│   ├── "/recharge"
│   ├── "/profile"
│   ├── "/history"
│   └── "/notifications"
│
└── "/admin/***" (AdminLayoutComponent)   [Protected by authGuard + adminGuard]
    └── "/admin/dashboard"
```

**Features:**

- Lazy loading with `loadComponent: () => import(...)`
- Route guards for protection
- Unsaved changes warning on `/recharge`, `/profile`, `/admin/dashboard`

### 3. **Guard Layer**

#### `authGuard` - Authentication Check

```typescript
// If NOT logged in: redirect to /auth/login (store return URL)
// If logged in: allow access
```

#### `adminGuard` - Authorization Check

```typescript
// If logged in AND admin role: allow
// Else: redirect to /dashboard
```

#### `unsavedChangesGuard` - Data Loss Prevention

```typescript
// If form has unsaved changes: confirm before navigation
// Components must implement HasUnsavedChanges interface
```

### 4. **Interceptor Layer**

#### `authInterceptor`

**Public Endpoints (NO token):**

- `/api/auth/send-otp`
- `/api/auth/verify-phone-otp`
- `/api/operators/detect`
- `/api/operators/` (GET)
- `/api/plans/` (GET)

**Authenticated Endpoints (WITH token):**

- All other API requests
- Attaches `Authorization: Bearer {token}` header
- On 401: Auto-refresh using refresh token
- On refresh failure: Logout & redirect

#### `responseInterceptor`

```
Input:  API Response { success, message, data }
              ↓
        Unwrap & extract .data
              ↓
        If Spring Page<T>: extract .content array
              ↓
Output: Clean data directly to service
```

**Error Handling:**

- 401 → Clear tokens → `/auth/login`
- 403 → `/error/403`
- 404 → `/error/404`
- 500+ → `/error/500`

---

## 🔐 Authentication & Authorization

### Phone OTP Login Flow

```
Step 1: Send OTP
└─ User enters phone number (10 digits, India only)
└─ AuthService.sendOtp(mobileNumber)
└─ Backend sends SMS (real) or displays OTP (dev/mock)

Step 2: Verify OTP
└─ User enters 6-digit OTP
└─ AuthService.verifyPhoneOtp({ mobileNumber, otp, fullName? })
└─ Response: AuthResponse { accessToken, refreshToken, user, isNewUser }

Step 3: Persist & Redirect
└─ localStorage: accessToken, refreshToken, currentUser JSON
└─ BehaviorSubject.next(user) → UI updates
└─ Router redirects to returnUrl or /dashboard
└─ Schedule auto-token-refresh in background
```

### Token Management

| Token          | Type               | Location     | Duration   |
| -------------- | ------------------ | ------------ | ---------- |
| `accessToken`  | Short-lived JWT    | localStorage | ~15-30 min |
| `refreshToken` | Long-lived token   | localStorage | ~7 days    |
| `currentUser`  | User object (JSON) | localStorage | Session    |

**Auto-Refresh Flow:**

```
1. Extract expiresIn from accessToken response
2. Schedule refresh 1 minute BEFORE expiry
3. refreshToken() API call
4. Update both tokens silently
5. Continue without user interruption
```

### Admin vs User

```typescript
User Role Enum:
├── ROLE_USER    → Can access /dashboard, /recharge, /profile, /history
└── ROLE_ADMIN   → Can access /admin/* routes (+ user routes via switch)

Check: authService.isAdmin() → authService.getCurrentUser()?.role === 'ROLE_ADMIN'
```

---

## 🔧 Services Breakdown

### 1. **AuthService** - Core Authentication

**Methods:**

```typescript
// Phone OTP (Primary)
sendOtp(request: SendOtpRequest): Observable<any>
fetchDevOtp(mobileNumber: string): Observable<string>  // Dev only
verifyPhoneOtp(req: VerifyPhoneOtpRequest): Observable<AuthResponse>

// Google OAuth (Retained)
googleLogin(request: GoogleAuthRequest): Observable<AuthResponse>

// Password Reset (Legacy)
forgotPassword(request: ForgotPasswordRequest): Observable<any>
verifyOtp(request: VerifyOtpRequest): Observable<any>
resetPassword(request: ResetPasswordRequest): Observable<any>

// Token Management
refreshToken(): Observable<AuthResponse>
private scheduleTokenRefresh(): void

// State & Queries
isLoggedIn(): boolean
isAdmin(): boolean
getCurrentUser(): User | null
getToken(): string | null
updateLocalUser(user: User): void

// Logout
logout(): void
```

**Observables:**

```typescript
currentUser$: Observable<User>; // Emits on login/logout
```

**Mock Support:**

```typescript
if (environment.useMockApi) {
  // Admin: 8688179553
  // User: any other number
  return of(mockResponse).pipe(delay(500));
}
```

---

### 2. **UserService** - Profile Management

**Methods:**

```typescript
getProfile(forceRefresh = false): Observable<User>
  // Cache: 5 min TTL via CacheService

updateProfile(request: UpdateProfileRequest): Observable<User>
  // Clear cache on success

changePassword(request: ChangePasswordRequest): Observable<User>
```

**Features:**

- Uses CacheService for response caching
- Normalizes user objects
- Updates AuthService on profile changes
- Mock: Returns current user data

---

### 3. **OperatorService** - Telecom Operators

**Methods:**

```typescript
// Detect operator from mobile number
detectOperator(mobileNumber: string): Observable<OperatorDetectionResponse>

// Get all active operators
getActiveOperators(): Observable<Operator[]>

// Get plans for operator
getOperatorPlans(operatorId: number): Observable<Plan[]>

// Admin CRUD
createOperator(operator: Operator): Observable<Operator>      // ADMIN
updateOperator(id: number, operator: Operator): Observable<Operator>
deleteOperator(id: number): Observable<void>

createPlan(plan: Plan): Observable<Plan>                      // ADMIN
updatePlan(id: number, plan: Plan): Observable<Plan>
deletePlan(id: number): Observable<void>
```

**Mock Data Persistence:**

```typescript
// Uses localStorage for CRUD operations in mock mode
localStorage.setItem('omni_operators', JSON.stringify(mockOperators));
localStorage.setItem('omni_plans', JSON.stringify(mockPlans));
```

**Data Model:**

```typescript
interface Operator {
  id: number;
  name: string; // "Jio", "Airtel", "Vodafone"
  code: string; // "JIO", "AIRTEL", etc.
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Plan {
  id: number;
  operatorId: number;
  operatorName: string;
  name: string; // "Jio 1GB/day 28 days"
  price: number; // 249
  validity: number; // 28 (days)
  data: string; // "1GB/day"
  description: string;
  category: string; // "DATA", "VOICE", "COMBO"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

### 4. **RechargeService** - Recharge Orchestration

**Methods:**

```typescript
// Recharge Workflow (Saga Pattern)
initiateRecharge(request: RechargeRequest): Observable<Recharge>
  // Backend expects: { mobileNumber, operatorId, planId, paymentMethod }
  // Extra fields cause Jackson UnrecognizedPropertyException (400)

completeRecharge(recharge: Recharge, transactionId: string): void
  // Mark SUCCESS + add to history

failRecharge(recharge: Recharge): void
  // Mark FAILED + refund compensation

getRechargeHistory(): Observable<Recharge[]>
```

**Observables:**

```typescript
rechargeHistory$: Observable<Recharge[]>; // Emits on history change
```

**Mock Persistence:**

```typescript
// Recharge history survives page reload via localStorage
localStorage.setItem('omni_recharges', JSON.stringify(recharges));
```

**Data Model:**

```typescript
interface Recharge {
  id: number;
  rechargeId: string; // "RCH-XXXXX"
  userId: number;
  mobileNumber: string;
  operatorId: number;
  operatorName: string; // "Jio"
  planId: number;
  planName: string; // "Plan name"
  amount: number; // 249 (INR)
  status: 'INITIATED' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  failureReason?: string;
  transactionId: string; // Links to payment system
  planValidityDays?: number;
  planExpiryDate?: string;
  createdDate: string; // ISO format
  lastModifiedDate?: string;
}
```

---

### 5. **PaymentService** - Razorpay Integration

**Methods:**

```typescript
// Step 1: Create Razorpay Order
createOrder(payload: {
  amount: number
  currency: 'INR'
  rechargeId: string
}): Observable<{
  transactionId: string
  razorpayOrderId: string
  amount: number  // in paise
  currency: string
  rechargeId: string
}>

// Step 2: Open Razorpay Checkout Modal
openRazorpayCheckout(options: {
  orderId: string
  amount: number
  currency?: string
  name?: string
  description?: string
  phoneNumber?: string
  email?: string
}): Promise<any>

// Step 3: Verify Payment
verifyPayment(payload: {
  razorpayPaymentId: string
  razorpayOrderId: string
  razorpaySignature: string
}): Observable<{ verified: boolean }>

// Transaction History
getTransactionHistory(): Observable<Transaction[]>
```

**Razorpay Checkout Flow:**

```
1. UI: User clicks "Pay" button
2. Service: createOrder() → get razorpayOrderId from backend
3. Service: openRazorpayCheckout() → modal opens
4. User: Enters card/UPI/wallet details
5. Service: verifyPayment() → backend signature verification
6. Service: If SUCCESS → emit to RechargeService.completeRecharge()
7. Service: If FAILED → emit to RechargeService.failRecharge()
```

**Mock Mode:**

```typescript
if (environment.useMockApi) {
  // Simulate successful payment
  return of({ verified: true }).pipe(delay(1000));
}
```

---

### 6. **NotificationService** - Alerts & Notifications

**Methods:**

```typescript
// Add local notification (in-app alert)
addLocalNotification(
  title: string,
  message: string,
  category: string,
  type: 'IN_APP' | 'EMAIL' | 'SMS'
): void

// Send all post-payment notifications
sendPaymentNotifications(params: {
  amount: number
  transactionId: string
  operatorName: string
  planData: string
  mobileNumber: string
  planName: string
  userName: string
}): void
  // Sends: IN_APP + SMS + EMAIL

// Get all notifications
getNotifications(): Observable<Notification[]>

// Mark as read
markAsRead(id: number): Observable<void>

// Clear old notifications
clearOldNotifications(): void
```

**Observables:**

```typescript
notifications$: Observable<Notification[]>; // Via BehaviorSubject
```

**Data Model:**

```typescript
interface Notification {
  id: number;
  userId: number;
  title: string; // "Recharge Successful"
  message: string; // "₹249 added to your Jio account"
  type: 'IN_APP' | 'EMAIL' | 'SMS';
  category: string; // "PAYMENT", "SYSTEM", "ALERT"
  isRead: boolean;
  metadata: any; // Optional contextual data
  createdDate: string;
  updatedAt: string;
}
```

---

### 7. **CacheService** - Smart Caching Layer

**Methods:**

```typescript
// Get from cache if exists and not expired
get<T>(key: string): T | null

// Store with TTL (default 5 min)
set<T>(key: string, data: T, ttlMs?: number): void

// Remove from cache
invalidate(key: string): void

// Clear all
clear(): void
```

**Features:**

- **Dual Storage:** Memory cache (fast) + SessionStorage (persistent)
- **TTL Expiry:** Automatic invalidation after TTL
- **Fallback:** Checks memory first, then sessionStorage
- **Development-Friendly:** Disables in mock mode via flag

**Usage Example:**

```typescript
// In UserService
const cached = this.cacheService.get<User>('user_profile');
if (cached) return of(cached);

// After API call
this.cacheService.set('user_profile', user, 300000); // 5 min TTL
```

---

## 📊 Data Models

All models in `src/app/core/models/`

### User Model

```typescript
interface User {
  id: number;
  fullName: string;
  email: string;
  mobileNumber: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN';
  authProvider: 'LOCAL' | 'GOOGLE' | 'PHONE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthResponse {
  accessToken: string; // JWT for API requests
  refreshToken: string; // Long-lived refresh token
  tokenType: string; // "Bearer"
  expiresIn: number; // Seconds
  user: User;
  isNewUser?: boolean; // True for new registrations
}
```

### Operator Model

```typescript
interface Operator { id, name, code, isActive, createdAt, updatedAt }
interface Plan { id, operatorId, operatorName, name, price, validity, data, ... }
interface OperatorDetectionResponse {
  mobileNumber: string
  operator: Operator
  detectionMethod: string   // "MOCK_DETECTION", "NETWORK_PREFIX", etc.
}
```

### Recharge Model

```typescript
interface Recharge { id, rechargeId, userId, mobileNumber, operatorId, operatorName, planId, planName, amount, status, transactionId, ... }
interface RechargeRequest { mobileNumber, planId, paymentMethod }
interface Transaction { id, transactionId, rechargeId, userId, amount, paymentMethod, status, razorpayOrderId, ... }
```

### Notification Model

```typescript
interface Notification {
  id;
  userId;
  title;
  message;
  type;
  category;
  isRead;
  metadata;
  createdDate;
  updatedAt;
}
```

---

## 🎨 Component Hierarchy

### Layouts

#### **UserLayoutComponent** (`core/layouts/user-layout/`)

```
UserLayout
├── MatSideNav (navigation drawer)
│   ├── Logo section
│   ├── Nav items: Dashboard, Recharge, Profile, History, Notifications
│   └── User profile card
├── MatToolbar (top bar)
│   ├── Menu toggle button
│   ├── Title bar
│   ├── Search/notifications area
│   └── User menu (profile, logout)
└── RouterOutlet (nested routes)
    ├── Dashboard
    ├── Recharge
    ├── Profile
    ├── History
    └── Notifications
```

#### **AdminLayoutComponent** (`core/layouts/admin-layout/`)

```
AdminLayout (currently in editor)
├── MatSideNav (admin drawer)
│   ├── Logo: "Admin Portal"
│   ├── MANAGEMENT section
│   │   └── System Overview (analytics icon)
│   └── USER ZONE section
│       └── Switch to User View
├── MatToolbar (admin toolbar with glass effect)
│   ├── Menu toggle
│   ├── Title bar
│   └── Admin options
└── RouterOutlet (nested routes)
    └── Admin Dashboard
```

### Feature Components

#### **LoginComponent** (`features/auth/login/`)

```
LoginComponent (Phone OTP Auth)
├── Auth Card
│   ├── Step 1: Phone Number Entry
│   │   ├── Country code (+91)
│   │   ├── Phone input (10 digits, Indian mobile)
│   │   └── Send OTP button
│   │
│   └── Step 2: OTP Verification
│       ├── Display sent-to number
│       ├── OTP input (6 digits)
│       ├── Resend OTP link
│       └── Verify button
│
├── Info text: "We'll send verification code to your phone"
├── Links: Register, Forgot Password
└── Mock admin: 8688179553 (auto-login as admin)
```

#### **RechargeComponent** (`features/recharge/`)

```
RechargeComponent (3-Step Recharge Saga)

MatStepper (Linear):
├── Step 1: ENTER NUMBER
│   ├── Mobile number input
│   ├── Auto-detect operator (Jio/Airtel/etc.)
│   ├── Display operator logo + name
│   └── Next button
│
├── Step 2: SELECT PLAN
│   ├── Filter plans by operator
│   ├── Display plan cards
│   │   ├── Plan name
│   │   ├── Price (₹249)
│   │   ├── Validity (28 days)
│   │   ├── Data (1GB/day)
│   │   └── Category
│   ├── Plan selection radio button
│   └── Next button
│
└── Step 3: PAY
    ├── Order summary
    │   ├── Mobile number
    │   ├── Operator
    │   ├── Plan details
    │   └── Total amount
    ├── Payment method selection
    │   └── Razorpay (default)
    ├── Pay button
    └── Processing spinner (during payment)

Saga Flow:
1. INITIATE_RECHARGE → rechargeService.initiateRecharge()
2. CREATE_ORDER → paymentService.createOrder()
3. RAZORPAY_CHECKOUT → paymentService.openRazorpayCheckout()
4. VERIFY_PAYMENT → paymentService.verifyPayment()
5. COMPLETE_RECHARGE → rechargeService.completeRecharge()
6. SEND_NOTIFICATIONS → notificationService.sendPaymentNotifications()
```

#### **DashboardComponent** (`features/dashboard/`)

```
DashboardComponent (User Home)
├── Notification Bar (if recent notifications exist)
│   ├── Notification icon (pulsing)
│   ├── Title + message
│   └── Dismiss button
│
├── Welcome Banner
│   ├── Greeting: "Welcome back, {UserName}!"
│   ├── Subtitle
│   └── Decorative glowing orbs
│
├── Quick Actions (Card Layout)
│   ├── Quick Recharge (Mobile icon)
│   ├── Check Balance (Wallet icon)
│   ├── Refer & Earn (Share icon)
│   └── Help & Support (Help icon)
│
├── Recent Recharges
│   ├── Recharge history list
│   └── Show transaction ID, amount, date, status-badge
│
└── Quick Stats (Grid)
    ├── Total Recharges (card 1)
    ├── Amount Spent This Month (card 2)
    └── Active Plan (card 3)
```

#### **ProfileComponent** (`features/profile/`)

```
ProfileComponent (User Profile Edit)
├── Forms
│   ├── Full Name (editable)
│   ├── Email (read-only or editable)
│   ├── Mobile Number (editable)
│   └── Account created date (read-only)
│
├── Update Profile Button
│   └── PATCH /api/users/profile
│
└── Change Password Section
    ├── Current Password
    ├── New Password
    ├── Confirm Password
    └── Change Password Button
        └── POST /api/users/change-password
```

#### **HistoryComponent** (`features/history/`)

```
HistoryComponent (Recharge History)
├── Filters/Sorting
│   ├── date range picker
│   ├── Status filter (Success/Failed/Pending)
│   └── Sort by date (newest first)
│
├── Recharge History Table
│   ├── Columns: Date, Mobile, Operator, Plan, Amount, Status, Action
│   ├── Status badge (green=Success, red=Failed)
│   └── Download receipt / Details button
│
└── Pagination
    └── 10 per page (or configurable)
```

#### **NotificationsComponent** (`features/notifications/`)

```
NotificationsComponent (Notification Center)
├── Tabs/Filters
│   ├── All Notifications
│   ├── Unread Only
│   ├── By Category
│   └── By Type (In-App, SMS, Email)
│
├── Notification List
│   ├── Each: Title, Message, Date, Icon by category
│   ├── Mark as read/unread toggle
│   └── Delete button
│
└── Mark All as Read Button
```

#### **AdminComponent** (`features/admin/`)

```
AdminComponent (System Overview)
├── System Statistics
│   ├── Total Users
│   ├── Total Recharges Today
│   ├── Total Revenue Today
│   └── Failed Transactions Count
│
├── Operator Management Section
│   ├── Table: Operator list (ID, Name, Code, Status)
│   ├── Add Operator button
│   ├── Edit / Delete operators
│   └── Toggle Active/Inactive
│
├── Plans Management Section
│   ├── Table: Plans by operator
│   ├── Add Plan button
│   ├── Edit / Delete plans
│   └── Filter by operator
│
└── User Management Section
    ├── Table: Users (ID, Name, Email, Mobile, Role, Status)
    ├── Promote to Admin / Demote
    ├── Block / Unblock user
    └── View user transaction history
```

---

## 👥 User Flows

### User Registration & Login Flow

```
1. Welcome Screen (/)
   ├─ Welcome Component shown
   │
2. User clicks "Get Started" or navigates to /auth/login
   │
3. LoginComponent appears with phone input
   ├─ User enters 10-digit mobile number
   ├─ (Mock Note: 8688179553 = Admin user)
   │
4. User clicks "Send OTP"
   ├─ AuthService.sendOtp(mobileNumber) called
   ├─ Real mode: SMS sent to phone
   ├─ Mock mode: OTP displayed (123456)
   │
5. OTP Input Step
   ├─ User enters 6-digit OTP
   ├─ Can resend OTP
   │
6. User clicks "Verify"
   ├─ AuthService.verifyPhoneOtp({ mobileNumber, otp }) called
   ├─ Response: { accessToken, refreshToken, user, isNewUser }
   ├─ localStorage: save tokens + user JSON
   ├─ AuthService.currentUser$ emits new user
   │
7. Auto-Redirect
   ├─ If new user: redirect to /auth/register (optional profile setup)
   ├─ If existing: redirect to returnUrl or /dashboard
   │
8. Dashboard Appears
   └─ UserLayoutComponent wraps content
      ├─ Sidenav shows user name & avatar
      ├─ Welcome banner greets user
      └─ Quick action cards available
```

### Recharge Workflow (End-to-End)

```
1. User at dashboard
   └─ Clicks "Quick Recharge" card

2. Router: navigate('/recharge')
   └─ RechargeComponent loads (lazy loaded)

3. Recharge Form (MatStepper)

   STEP 1: Enter Number
   ├─ User enters mobile number (mobileNumber field)
   ├─ User clicks "Next"
   ├─ OperatorService.detectOperator(mobileNumber) called
   ├─ Response: { operator: { id, name, code }, ... }
   ├─ Operator logo displayed (Jio/Airtel/etc.)
   └─ Step advances

   STEP 2: Select Plan
   ├─ OperatorService.getOperatorPlans(operatorId) called
   ├─ Plans displayed in cards (Price, Validity, Data, Category)
   ├─ User selects a plan (radio button)
   ├─ User clicks "Next"
   └─ Step advances

   STEP 3: Pay & Complete
   ├─ Order summary: Mobile, Operator, Plan, Amount
   ├─ Payment method dropdown (Razorpay selected)
   ├─ User clicks "Pay ₹{amount}"
   │
   └──► SAGA ORCHESTRATION BEGINS:

        Saga Step 1: INITIATE_RECHARGE
        ├─ RechargeService.initiateRecharge({
        │    mobileNumber, operatorId, planId, paymentMethod})
        ├─ Backend: POST /api/recharges
        └─ Response: { rechargeId, status: 'INITIATED', ... }

        Saga Step 2: CREATE_ORDER
        ├─ PaymentService.createOrder({
        │    amount, currency: 'INR', rechargeId })
        ├─ Backend: POST /api/payments/process
        └─ Response: { razorpayOrderId, transactionId, ... }

        Saga Step 3: RAZORPAY_CHECKOUT
        ├─ PaymentService.openRazorpayCheckout({
        │    orderId: razorpayOrderId,
        │    amount (in paise),
        │    name, description, email, phone })
        ├─ Razorpay modal opens (JavaScript)
        ├─ User enters card/UPI/wallet details
        ├─ Razorpay processes payment
        ├─ Modal closes with payment details
        └─ Response: { razorpayPaymentId, razorpayOrderId, razorpaySignature }

        Saga Step 4: VERIFY_PAYMENT
        ├─ PaymentService.verifyPayment({
        │    razorpayPaymentId,
        │    razorpayOrderId,
        │    razorpaySignature })
        ├─ Backend: POST /api/payments/verify
        ├─ Backend verifies Razorpay signature
        └─ Response: { verified: true/false }

        If verified: ✅
        │
        ├─ Saga Step 5: COMPLETE_RECHARGE
        │  ├─ RechargeService.completeRecharge(
        │  │    recharge, transactionId)
        │  ├─ Status updated: INITIATED → SUCCESS
        │  ├─ rechargeHistory$ emits updated list
        │  └─ localStorage updated
        │
        ├─ Saga Step 6: SEND_NOTIFICATIONS
        │  ├─ NotificationService.sendPaymentNotifications({
        │  │    amount, operatorName, planData, ...})
        │  ├─ IN_APP notification added (app alert)
        │  ├─ SMS notification (if SMS service available)
        │  └─ Email notification (if email service available)
        │
        └─ Success Modal shown with receipt
           ├─ ✅ Recharge Successful
           ├─ Amount, Transaction ID, Plan details
           ├─ "Download Receipt" button
           └─ "Return to Dashboard" button

        If NOT verified: ❌
        │
        ├─ Saga Step 5: FAIL_RECHARGE (Compensation)
        │  ├─ RechargeService.failRecharge(recharge)
        │  ├─ Status updated: INITIATED → FAILED
        │  ├─ Reason recorded: "Payment Verification Failed"
        │  └─ User notified: "Payment failed, check your account"
        │
        └─ Backend: Initiate refund to original payment method
           └─ (Razorpay API call for refund)

4. Post-Payment
   ├─ User clicks "Return to Dashboard"
   ├─ RechargeComponent.form.reset()
   ├─ Router.navigateByUrl('/dashboard')
   └─ Dashboard shows updated history + notification
```

### Admin Dashboard Usage

```
1. Admin logs in (Using phone: 8688179553 in mock)
   ├─ Role determined: ROLE_ADMIN
   ├─ Router: navigate('/admin/dashboard')
   │
2. AdminLayoutComponent loads
   ├─ Sidenav shows "System Overview" link
   ├─ Toolbar shows "Admin Portal" title
   └─ "Switch to User View" link available
   │
3. Admin Dashboard
   ├─ System stats widgets
   │  ├─ Total Users: 1234
   │  ├─ Recharges Today: 156
   │  ├─ Revenue Today: ₹45,230
   │  └─ Failed Count: 3
   │
   ├─ Operator Management (CRUD)
   │  ├─ List all operators
   │  ├─ Add new operator (form)
   │  ├─ Edit operator details
   │  └─ Toggle active/inactive
   │
   ├─ Plan Management (nested by operator)
   │  ├─ Filter plans by operator
   │  ├─ Add new plan (form)
   │  ├─ Edit plan
   │  └─ Archive/delete plan
   │
   └─ User Management
      ├─ View all users (paginated)
      ├─ Filter by role, status
      ├─ Promote user to admin
      ├─ Block/unblock user
      └─ View user transaction history
```

---

## ⚠️ Error Handling

### HTTP Error Interceptor

```
HTTP Status Code → Action

401 Unauthorized
├─ Clear: accessToken, refreshToken, user from localStorage
├─ If NOT already on /auth/ pages:
│  └─ Navigate to /auth/login
└─ Skip for public auth endpoints (/send-otp, /verify-otp)

403 Forbidden
├─ Navigate to /error/403 page
└─ User lacks permission for resource

404 Not Found
├─ Navigate to /error/404 page
└─ Resource doesn't exist

500 Server Error
├─ Navigate to /error/500 page
└─ Server-side issue

502/503/504 Gateway/Service Unavailable
├─ Navigate to /error/500 page
└─ Backend service down

Network Error (timeout, CORS, etc.)
├─ Handled by services with try/catch
├─ Logged to console in dev
└─ User shown toast/snackbar
```

### Component-Level Error Handling

```typescript
// Example: RechargeComponent payment failure
if (!verifyResponse.verified) {
  snackBar.open('Payment verification failed. Retrying...', 'Close', {
    duration: 5000,
    horizontalPosition: 'end',
  });
  RechargeService.failRecharge(recharge);
  // Optionally retry payment
}
```

### Service-Level Error Handling

```typescript
// Example: AuthService token refresh failure
refreshToken().pipe(
  catchError(() => {
    // Refresh token expired → force logout
    this.logout();
    router.navigate(['/auth/login']);
    return EMPTY;
  }),
);
```

---

## 💾 Caching Strategy

### Multi-Layer Caching

```
Request for data (e.g., user profile)
│
├─ Layer 1: Memory Cache (In-memory Map)
│  └─ Active component uses
│  └─ Fastest, but lost on page reload
│
├─ Layer 2: SessionStorage Cache
│  └─ Survives component unmount
│  └─ Survives navigation within tab
│  └─ Lost on tab close
│
├─ Layer 3: API Request
│  └─ Fresh data from backend
│  └─ Unwrapped by responseInterceptor
```

### TTL-Based Invalidation

```typescript
// Default TTL: 5 minutes (300000ms)

cacheService.set('user_profile', userData, 300000);
// After 5 minutes, this cache key is considered expired

// Manual invalidation
cacheService.invalidate('user_profile');
// Or force refresh
userService.getProfile((forceRefresh = true));
```

### Cache Keys

| Key                   | Service         | TTL   | Invalidated On |
| --------------------- | --------------- | ----- | -------------- |
| `user_profile`        | UserService     | 5 min | Profile update |
| `operators_list`      | OperatorService | 5 min | Operator CRUD  |
| `operator_plans_{id}` | OperatorService | 5 min | Plan CRUD      |
| `all_users`           | UserService     | 5 min | User changes   |

---

## 🎭 Mock API System

### Enable/Disable Mock Mode

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4200',
  useMockApi: true, // ← Toggle mock mode
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.omnicharge.com',
  useMockApi: false, // ← Real API in production
};
```

### Mock Data Structure

```typescript
// mock-data.ts

MOCK_AUTH_RESPONSE: AuthResponse
├─ accessToken: "mock-jwt-token"
├─ refreshToken: "mock-refresh-token"
├─ expiresIn: 900
└─ user: MOCK_USER

MOCK_USER: User (regular user)
├─ id: 1
├─ fullName: "Demo User"
├─ mobileNumber: "9876543210"
└─ role: "ROLE_USER"

MOCK_ADMIN: User (admin user)
├─ id: 2
├─ fullName: "Admin User"
├─ mobileNumber: "8688179553"  ← Login with this to get admin
└─ role: "ROLE_ADMIN"

MOCK_OPERATORS: Operator[]
├─ { id: 1, name: "Jio", code: "JIO", ... }
├─ { id: 2, name: "Airtel", code: "AIRTEL", ... }
├─ { id: 3, name: "Vodafone", code: "VODAFONE", ... }
└─ { id: 4, name: "BSNL", code: "BSNL", ... }

MOCK_PLANS: { [operatorId]: Plan[] }
├─ JIO_PLANS: [
│  { id: 1, name: "Jio 1GB/day 28d", price: 249, ... },
│  { id: 2, name: "Jio 2GB/day 28d", price: 399, ... },
│  ...
├─ AIRTEL_PLANS: [...]
└─ VODAFONE_PLANS: [...]

MOCK_NOTIFICATIONS: Notification[]
├─ Payment successful notifications
├─ System alerts
└─ Recharge confirmations

MOCK_ALL_USERS: User[]
└─ Pre-populated user list for admin view
```

### Mock API Behavior

```typescript
// Each service checks environment.useMockApi

if (environment.useMockApi) {
  // Return mock data with simulated delay
  return of(mockData).pipe(delay(400 - 800));
}

// Real API call
return this.http.get<ApiResponse>(url);
```

### LocalStorage Persistence in Mock Mode

```typescript
// Services persist data to localStorage:
localStorage.setItem('omni_operators', JSON.stringify(operators));
localStorage.setItem('omni_plans', JSON.stringify(plans));
localStorage.setItem('omni_recharges', JSON.stringify(recharges));
localStorage.setItem('omni_transactions', JSON.stringify(transactions));
localStorage.setItem('omni_notifications', JSON.stringify(notifications));
localStorage.setItem('omni_users', JSON.stringify(users));

// Data survives page reloads in dev mode
// Simulates backend persistence
```

---

## 🚀 Development Workflow

### Running the App

```bash
# Start dev server (mock API)
npm start
# Opens http://localhost:4200

# Run tests
npm test
# Karma + Jasmine test suite

# Build for production
npm build
# Output: dist/omnicharge-frontend/

# Docker build
docker build -t omnicharge-frontend .
```

### Development Proxy

```json
// proxy.conf.json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

### Environment Configuration

```typescript
// Switch environments
ng serve --configuration development   # Mock API
ng serve --configuration production   # Real API (if configured)
ng build --configuration production
```

---

## 📦 Dependencies Overview

| Package             | Version | Purpose                         |
| ------------------- | ------- | ------------------------------- |
| @angular/core       | 21.2.0  | Core Angular framework          |
| @angular/material   | 21.2.3  | UI components (Material Design) |
| @angular/cdk        | 21.2.3  | Component Development Kit       |
| @angular/animations | 21.2.5  | Animation support               |
| @angular/router     | 21.2.0  | Functional routing              |
| @angular/forms      | 21.2.0  | Reactive Forms                  |
| rxjs                | 7.8.0   | Reactive programming            |
| typescript          | 5.9.2   | Type safety                     |

---

## 🎓 Key Design Patterns Used

### 1. **Saga Pattern** (Recharge Workflow)

- Multi-step transaction orchestration
- Step-by-step state management
- Compensation on failure

### 2. **Service Layer Pattern**

- Encapsulation of business logic
- Reusable services across components
- Dependency injection

### 3. **Observable/RxJS Pattern**

- Reactive data streams
- BehaviorSubject for state management
- Operators: map, tap, catchError, delay, timeout

### 4. **Guard Pattern** (Route Protection)

- authGuard: Authentication
- adminGuard: Authorization
- unsavedChangesGuard: Data loss prevention

### 5. **Interceptor Pattern**

- authInterceptor: Token injection + auto-refresh
- responseInterceptor: Response normalization + error routing

### 6. **Singleton Pattern** (Services)

- providedIn: 'root' → Single instance app-wide
- Shared state across components

### 7. **Caching with TTL**

- Reduces API calls
- Improves UX performance
- Automatic expiration

### 8. **Lazy Loading**

- Components loaded on-demand
- Smaller initial bundle
- Faster startup time

---

## 📝 Summary

**OmniCharge Frontend** is a modern, well-architected Angular application following best practices:

✅ **Standalone Components** - No NgModules  
✅ **Functional Routing** - Modern syntax with lazy loading  
✅ **Strong Typing** - TypeScript for safety  
✅ **Reactive Programming** - RxJS Observables  
✅ **Material Design** - Professional UI  
✅ **Zoneless Change Detection** - Performance optimized  
✅ **Authentication** - Phone OTP + Google OAuth  
✅ **Interceptors** - Token + response handling  
✅ **Caching** - TTL-based multi-layer cache  
✅ **Error Handling** - HTTP error routing + UI feedback  
✅ **Mock API** - Development without backend  
✅ **Saga Pattern** - Complex multi-step transactions

**Core User Journeys:**

1. **Authentication** - Phone OTP login
2. **Recharge** - 3-step form → Razorpay payment → notifications
3. **Admin** - Operator, plan, user management

All code is well-organized, typed, and follows Angular best practices!
