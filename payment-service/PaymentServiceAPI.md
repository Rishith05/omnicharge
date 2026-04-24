# Payment Service - Complete API Documentation

## Overview

The Payment Service handles all payment processing, transaction management, and payment gateway integration for the OmniCharge platform. It integrates with Stripe for secure payment processing and publishes payment events to RabbitMQ for asynchronous communication with other microservices.

**Port:** 8084  
**Database:** omnicharge_payment_db (MySQL)  
**Gateway URL:** http://localhost:8080  
**Payment Gateway:** Stripe

---

## Architecture

```
User → API Gateway (8080) → Payment Service (8084)
                ↓                      ↓
         Validates JWT          Stripe API
         Adds Headers:               ↓
         - X-User-Id          Payment Processing
         - X-User-Role              ↓
         - X-User-Email       RabbitMQ Event
                                    ↓
                            Recharge Service
```

**Key Components:**
- **Payment Processing**: Stripe integration for secure payments
- **Transaction Management**: Complete transaction lifecycle tracking
- **Event Publishing**: RabbitMQ for async communication
- **Audit Trail**: Full audit logging for compliance

---

## Microservice Integration

### Integration with Operator Service
- **Dependency**: Payment service receives plan details from recharge service
- **Flow**: User selects plan → Recharge created → Payment initiated
- **Data**: Plan ID, amount, operator details passed via recharge context

### Integration with Recharge Service
- **Event-Driven**: Publishes `PaymentCompletedEvent` to RabbitMQ
- **Routing Key**: `payment.completed`
- **Consumer**: Recharge service listens and updates recharge status
- **Decoupling**: Services communicate asynchronously for resilience

### Security Model
- **Authentication**: Trusts API Gateway JWT validation
- **Authorization**: Uses headers from gateway (X-User-Id, X-User-Role)
- **User Isolation**: Users can only access their own transactions
- **Admin Access**: Full transaction visibility for ROLE_ADMIN

---

## Database Schema

### Transaction Table

```sql
CREATE TABLE transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(255) NOT NULL UNIQUE,
    recharge_id VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    failure_reason VARCHAR(500),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_recharge_id (recharge_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);
```

**Key Fields:**
- `transaction_id`: Unique identifier (TXN-XXXXXXXXXX format)
- `recharge_id`: Links to recharge in recharge-service
- `user_id`: Owner of the transaction
- `amount`: Payment amount in INR
- `payment_method`: CREDIT_CARD, DEBIT_CARD, UPI, NET_BANKING
- `status`: PENDING, SUCCESS, FAILED
- `stripe_payment_intent_id`: Stripe's payment intent ID
- `failure_reason`: Error message if payment fails

---

## Enums

### PaymentMethod
```java
CREDIT_CARD
DEBIT_CARD
UPI
NET_BANKING
```

### PaymentStatus
```java
PENDING   // Payment initiated, awaiting confirmation
SUCCESS   // Payment completed successfully
FAILED    // Payment failed or rejected
```

---

## API Endpoints

### User Endpoints (Requires Authentication)

#### 1. Process Payment

**Endpoint:** `POST /api/payments/process`

**Full URL:** `http://localhost:8080/api/payments/process`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body:**
```json
{
  "rechargeId": "RCH-ABC123",
  "userId": 1,
  "amount": 399.00,
  "paymentMethod": "UPI"
}
```

**IMPORTANT - Idempotency:**
- `rechargeId` is used as Stripe's idempotency key
- **Same rechargeId = Same payment result** (prevents duplicate charges)
- If you retry with the same `rechargeId`, Stripe returns the original payment result
- **Each new recharge must have a unique rechargeId**
- In production, Recharge Service generates unique rechargeId for each recharge request

**Validation Rules:**
- `rechargeId`: Required, not blank
- `userId`: Required, must be positive
- `amount`: Required, must be > 0.01
- `paymentMethod`: Required (CREDIT_CARD, DEBIT_CARD, UPI, NET_BANKING)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionId": "TXN-A1B2C3D4E5",
    "status": "SUCCESS",
    "stripePaymentIntentId": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
    "amount": 399.00,
    "timestamp": "2026-03-20T18:30:00"
  },
  "timestamp": "2026-03-20T18:30:00"
}
```

**Response (200 OK - Failed Payment):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionId": "TXN-A1B2C3D4E5",
    "status": "FAILED",
    "stripePaymentIntentId": null,
    "amount": 399.00,
    "timestamp": "2026-03-20T18:30:00"
  },
  "timestamp": "2026-03-20T18:30:00"
}
```

**Payment Flow:**
1. Creates transaction record with PENDING status
2. Calls Stripe API to process payment
3. Updates transaction with Stripe response
4. Publishes PaymentCompletedEvent to RabbitMQ
5. Returns payment response to client

**Stripe Integration:**
- Converts amount to paise (INR smallest unit)
- Creates PaymentIntent with automatic payment methods
- Maps payment methods to Stripe types
- Handles Stripe exceptions gracefully

---

#### 2. Get Transaction by ID

**Endpoint:** `GET /api/payments/{transactionId}`

**Full URL:** `http://localhost:8080/api/payments/TXN-A1B2C3D4E5`

**Headers:**
```
Authorization: Bearer {access_token}
X-User-Id: 1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "id": 1,
    "transactionId": "TXN-A1B2C3D4E5",
    "rechargeId": "RCH-ABC123",
    "userId": 1,
    "amount": 399.00,
    "paymentMethod": "UPI",
    "status": "SUCCESS",
    "failureReason": null,
    "stripePaymentIntentId": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
    "createdDate": "2026-03-20T18:30:00"
  },
  "timestamp": "2026-03-20T18:35:00"
}
```

**Security:**
- Validates that X-User-Id matches transaction owner
- Returns 400 Bad Request if user tries to access another user's transaction

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Unauthorized access to transaction",
  "data": null,
  "timestamp": "2026-03-20T18:35:00"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Transaction not found with id: TXN-INVALID",
  "data": null,
  "timestamp": "2026-03-20T18:35:00"
}
```

---

#### 3. Get Payment History (Paginated with Filters)

**Endpoint:** `GET /api/payments/history`

**Full URL:** 
```
http://localhost:8080/api/payments/history?page=0&size=10&sortBy=createdDate&sortDir=DESC
```

**Headers:**
```
Authorization: Bearer {access_token}
X-User-Id: 1
```

**Query Parameters:**
- `minAmount` (optional): Minimum transaction amount (e.g., 100.00)
- `maxAmount` (optional): Maximum transaction amount (e.g., 500.00)
- `status` (optional): Filter by status (SUCCESS, PENDING, FAILED)
- `startDate` (optional): Start date in ISO format (e.g., 2026-03-01T00:00:00)
- `endDate` (optional): End date in ISO format (e.g., 2026-03-31T23:59:59)
- `page` (optional, default: 0): Page number
- `size` (optional, default: 10): Page size
- `sortBy` (optional, default: createdDate): Sort field (createdDate, amount, status)
- `sortDir` (optional, default: DESC): ASC or DESC

**Filter Examples:**
```
# All payments for user
GET /api/payments/history

# Payments above ₹100
GET /api/payments/history?minAmount=100

# Payments between ₹100 and ₹500
GET /api/payments/history?minAmount=100&maxAmount=500

# Only successful payments
GET /api/payments/history?status=SUCCESS

# Payments from last 7 days
GET /api/payments/history?startDate=2026-03-14T00:00:00

# Failed payments in March 2026
GET /api/payments/history?status=FAILED&startDate=2026-03-01T00:00:00&endDate=2026-03-31T23:59:59

# Successful payments above ₹200, sorted by amount (highest first)
GET /api/payments/history?status=SUCCESS&minAmount=200&sortBy=amount&sortDir=DESC
```

**Security:**
- Users can ONLY see their own transactions
- X-User-Id header is automatically validated
- Backend filters by authenticated user's ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment history retrieved successfully",
  "data": {
    "content": [
      {
        "id": 3,
        "transactionId": "TXN-F9G8H7I6J5",
        "rechargeId": "RCH-XYZ789",
        "userId": 1,
        "amount": 666.00,
        "paymentMethod": "CREDIT_CARD",
        "status": "SUCCESS",
        "failureReason": null,
        "stripePaymentIntentId": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
        "createdDate": "2026-03-20T18:30:00"
      },
      {
        "id": 2,
        "transactionId": "TXN-K4L3M2N1O0",
        "rechargeId": "RCH-DEF456",
        "userId": 1,
        "amount": 299.00,
        "paymentMethod": "UPI",
        "status": "FAILED",
        "failureReason": "Insufficient funds",
        "stripePaymentIntentId": null,
        "createdDate": "2026-03-19T14:20:00"
      }
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 2,
    "totalPages": 1,
    "last": true
  },
  "timestamp": "2026-03-20T18:40:00"
}
```

**Use Case:**
- User views their complete payment history
- Supports pagination for large transaction lists
- Sorted by most recent first (default)

---

### Admin Endpoints (Requires ROLE_ADMIN)

#### 4. Get All Transactions (Admin with Advanced Filters)

**Endpoint:** `GET /api/admin/payments`

**Full URL:** 
```
http://localhost:8080/api/admin/payments?page=0&size=20&sortBy=createdDate&sortDir=DESC
```

**Headers:**
```
Authorization: Bearer {admin_access_token}
X-User-Role: ADMIN
```

**Query Parameters:**
- `userId` (optional): Filter by specific user ID
- `rechargeId` (optional): Filter by specific recharge ID
- `minAmount` (optional): Minimum transaction amount
- `maxAmount` (optional): Maximum transaction amount
- `status` (optional): Filter by status (SUCCESS, PENDING, FAILED)
- `startDate` (optional): Start date in ISO format
- `endDate` (optional): End date in ISO format
- `page` (optional, default: 0): Page number
- `size` (optional, default: 10): Page size
- `sortBy` (optional, default: createdDate): Sort field
- `sortDir` (optional, default: DESC): ASC or DESC

**Admin Filter Examples:**
```
# All transactions (admin view)
GET /api/admin/payments

# All transactions for specific user
GET /api/admin/payments?userId=5

# High-value transactions (above ₹1000)
GET /api/admin/payments?minAmount=1000

# All failed transactions
GET /api/admin/payments?status=FAILED

# Track specific recharge
GET /api/admin/payments?rechargeId=RCH-12345

# Failed payments above ₹500 in last 7 days
GET /api/admin/payments?status=FAILED&minAmount=500&startDate=2026-03-14T00:00:00

# All transactions for user in date range
GET /api/admin/payments?userId=3&startDate=2026-03-01T00:00:00&endDate=2026-03-31T23:59:59
```

**Security:**
- Only ADMIN users can access this endpoint
- X-User-Role header must be "ADMIN"
- Non-admin users receive 403 Forbidden
- All admin queries are logged for audit

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All transactions retrieved successfully",
  "data": {
    "content": [
      {
        "id": 5,
        "transactionId": "TXN-P9Q8R7S6T5",
        "rechargeId": "RCH-GHI012",
        "userId": 3,
        "amount": 719.00,
        "paymentMethod": "NET_BANKING",
        "status": "SUCCESS",
        "failureReason": null,
        "stripePaymentIntentId": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
        "createdDate": "2026-03-20T19:00:00"
      },
      {
        "id": 4,
        "transactionId": "TXN-U4V3W2X1Y0",
        "rechargeId": "RCH-JKL345",
        "userId": 2,
        "amount": 399.00,
        "paymentMethod": "DEBIT_CARD",
        "status": "FAILED",
        "failureReason": "Card declined",
        "stripePaymentIntentId": null,
        "createdDate": "2026-03-20T18:45:00"
      }
    ],
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 2,
    "totalPages": 1,
    "last": true
  },
  "timestamp": "2026-03-20T19:05:00"
}
```

**Use Case:**
- Admin views all transactions across all users
- Monitor payment success/failure rates
- Investigate payment issues
- Financial reporting and reconciliation

---

#### 5. Get Payment Statistics (Admin - Enhanced)

**Endpoint:** `GET /api/admin/payments/stats`

**Full URL:** `http://localhost:8080/api/admin/payments/stats?days=30`

**Headers:**
```
Authorization: Bearer {admin_access_token}
X-User-Role: ADMIN
```

**Query Parameters:**
- `days` (optional, default: 30): Number of days for revenue trends (7, 30, 90, etc.)

**Examples:**
```
# Last 30 days (default)
GET /api/admin/payments/stats

# Last 7 days
GET /api/admin/payments/stats?days=7

# Last 90 days
GET /api/admin/payments/stats?days=90
```

**Security:**
- Only ADMIN users can access
- X-User-Role header validated

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment stats retrieved successfully",
  "data": {
    "totalTransactions": 1250,
    "successfulTransactions": 1180,
    "failedTransactions": 60,
    "pendingTransactions": 10,
    
    "totalRevenue": 375000.00,
    "successAmount": 375000.00,
    "failedAmount": 18000.00,
    "averageTransactionAmount": 317.80,
    
    "todayTransactions": 45,
    "todayRevenue": 13500.00,
    
    "revenueByDate": [
      {
        "date": "2026-03-21",
        "transactionCount": 45,
        "revenue": 13500.00
      },
      {
        "date": "2026-03-20",
        "transactionCount": 52,
        "revenue": 15600.00
      }
    ],
    
    "topUsers": [
      {
        "userId": 123,
        "transactionCount": 25,
        "totalSpent": 7500.00
      },
      {
        "userId": 456,
        "transactionCount": 18,
        "totalSpent": 5400.00
      }
    ]
  },
  "timestamp": "2026-03-20T19:10:00"
}
```

**Stats Explanation:**
- `totalTransactions`: All-time transaction count
- `successfulTransactions`: Count of successful payments
- `failedTransactions`: Count of failed payments
- `pendingTransactions`: Count of pending payments
- `totalRevenue`: Total revenue from successful payments (all-time)
- `successAmount`: Same as totalRevenue
- `failedAmount`: Sum of failed payment attempts
- `averageTransactionAmount`: Average amount per successful transaction
- `todayTransactions`: Transactions created today
- `todayRevenue`: Revenue generated today
- `revenueByDate`: Daily breakdown for last N days (specified by `days` parameter)
- `topUsers`: Top 10 users by total spending (successful payments only)

**Use Cases:**
- Monitor daily revenue and transaction volume
- Identify problematic users (high failure rate)
- Analyze revenue trends over time
- Identify top customers (VIP users)
- Detect fraud patterns (high-value failures)
- Generate financial reports
- Business intelligence and analytics

---

## Advanced Filtering & Search

### User Payment History Filtering

Users can filter their payment history using multiple criteria:

**Available Filters:**
- **Amount Range**: `minAmount` and `maxAmount` parameters
- **Status**: Filter by SUCCESS, PENDING, or FAILED
- **Date Range**: `startDate` and `endDate` in ISO 8601 format
- **Sorting**: Sort by createdDate, amount, or status
- **Pagination**: Control page size and number

**Common Use Cases:**

1. **View Recent Payments**
   ```
   GET /api/payments/history?sortBy=createdDate&sortDir=DESC
   ```

2. **Find Specific Payment by Amount**
   ```
   GET /api/payments/history?minAmount=299&maxAmount=301
   ```
   (If you paid ₹300, search between ₹299-₹301)

3. **Check Failed Payments**
   ```
   GET /api/payments/history?status=FAILED
   ```

4. **Monthly Statement**
   ```
   GET /api/payments/history?startDate=2026-03-01T00:00:00&endDate=2026-03-31T23:59:59
   ```

5. **High-Value Transactions**
   ```
   GET /api/payments/history?minAmount=1000
   ```

### Admin Advanced Filtering

Admins have additional filtering capabilities:

**Additional Admin Filters:**
- **User ID**: Filter transactions for specific user
- **Recharge ID**: Track specific recharge request
- All user filters (amount, status, date)

**Admin Use Cases:**

1. **Monitor Daily Revenue**
   ```
   GET /api/admin/payments/stats
   ```
   Check `todayRevenue` and `todayTransactions`

2. **Identify Problem Users**
   ```
   GET /api/admin/payments?userId=5&status=FAILED
   ```

3. **Track Specific Recharge**
   ```
   GET /api/admin/payments?rechargeId=RCH-12345
   ```

4. **Revenue Trends**
   ```
   GET /api/admin/payments/stats?days=7
   ```
   Use `revenueByDate` array for charts

5. **Top Customers (VIP Identification)**
   ```
   GET /api/admin/payments/stats
   ```
   Check `topUsers` array

6. **Fraud Detection**
   ```
   GET /api/admin/payments?status=FAILED&minAmount=5000
   ```
   High-value failed transactions

7. **Financial Reports**
   ```
   GET /api/admin/payments?startDate=2026-03-01T00:00:00&endDate=2026-03-31T23:59:59&status=SUCCESS
   ```

### Date Format

All date parameters must use ISO 8601 format:
- **Format**: `YYYY-MM-DDTHH:mm:ss`
- **Example**: `2026-03-21T10:30:00`
- **Timezone**: UTC (or specify: `2026-03-21T10:30:00+05:30`)

**Common Date Filters:**
```
Today: 2026-03-21T00:00:00
Last 7 days: 2026-03-14T00:00:00
Last 30 days: 2026-02-20T00:00:00
This month: startDate=2026-03-01T00:00:00&endDate=2026-03-31T23:59:59
```

### Performance Notes

1. **Indexed Fields**: Queries on `userId`, `status`, `createdDate` are optimized
2. **Pagination**: Always use pagination for large result sets
3. **Date Ranges**: Narrow date ranges improve query performance
4. **Combined Filters**: Multiple filters are AND-ed together for precise results

### Security Features

**User Endpoint Security:**
1. **Automatic User Isolation**: Backend filters by X-User-Id header
2. **JWT Validation**: API Gateway validates token before forwarding
3. **No Cross-User Access**: User 1 cannot see User 2's payments
4. **Header Validation**: X-User-Id must match authenticated user

**Admin Endpoint Security:**
1. **Role-Based Access Control**: @PreAuthorize("hasRole('ADMIN')")
2. **Runtime Role Check**: X-User-Role header validated in controller
3. **403 Forbidden Response**: Non-admin users denied access
4. **Audit Trail**: All admin queries logged with user info

---

## Event Publishing

### PaymentCompletedEvent

**Exchange:** `omnicharge.exchange`  
**Routing Key:** `payment.completed`  
**Message Format:** JSON

**Event Structure:**
```json
{
  "transactionId": "TXN-A1B2C3D4E5",
  "rechargeId": "RCH-ABC123",
  "userId": 1,
  "userEmail": "user@example.com",
  "userMobile": "+919876543210",
  "mobileNumber": "9876543210",
  "operatorName": "Airtel",
  "planName": "Unlimited 84 Days",
  "amount": 399.00,
  "status": "SUCCESS",
  "paymentMethod": "UPI",
  "timestamp": "2026-03-20T18:30:00"
}
```

**Published When:**
- After payment processing completes (SUCCESS, FAILED, or PENDING)
- Regardless of payment outcome (for audit trail)

**Consumers:**
- **Recharge Service**: Updates recharge status based on payment status
- **Notification Service**: Sends payment confirmation/failure notifications

**Error Handling:**
- Event publishing failures are logged but don't fail the payment
- Ensures payment processing is not blocked by messaging issues

---

## Stripe Integration

### Configuration

**Environment Variables:**
```properties
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**Test Mode:**
- Use Stripe test keys for development
- Test cards: https://stripe.com/docs/testing

**Production Mode:**
- Use Stripe live keys
- Enable webhook endpoints for payment confirmations
- Configure 3D Secure for card payments

### Payment Flow

```
1. User initiates payment
   ↓
2. Payment Service creates Transaction (PENDING)
   ↓
3. Call Stripe API: PaymentIntent.create()
   - Amount in paise (₹399 = 39900 paise)
   - Currency: INR
   - Payment method: card/upi/netbanking
   - Metadata: rechargeId, userId, transactionId
   ↓
4. Stripe processes payment
   ↓
5. Stripe returns PaymentIntent
   - Status: succeeded/processing/failed
   ↓
6. Update Transaction status
   - succeeded → SUCCESS
   - processing → PENDING
   - failed → FAILED
   ↓
7. Publish PaymentCompletedEvent
   ↓
8. Return response to client
```

### Payment Method Mapping

| OmniCharge Method | Stripe Type | Notes |
|-------------------|-------------|-------|
| CREDIT_CARD | card | Visa, Mastercard, Amex |
| DEBIT_CARD | card | Debit cards |
| UPI | upi | UPI payments (India) |
| NET_BANKING | netbanking | Internet banking |

### Error Handling

**Stripe Exceptions:**
- `CardException`: Card declined, insufficient funds
- `RateLimitException`: Too many requests
- `InvalidRequestException`: Invalid parameters
- `AuthenticationException`: Invalid API key
- `ApiConnectionException`: Network issues
- `ApiException`: Generic Stripe error

**Fallback:**
- All Stripe exceptions result in FAILED status
- Error details logged for debugging
- User-friendly error message returned

---

## Security & Compliance

### Authentication & Authorization

**Gateway-Based Security:**
- Payment service trusts API Gateway for JWT validation
- No local JWT processing (stateless)
- Receives user context via headers:
  - `X-User-Id`: Authenticated user ID
  - `X-User-Role`: User role (USER/ADMIN)
  - `X-User-Email`: User email

**Endpoint Security:**
- User endpoints: Require valid JWT token
- Admin endpoints: Require ROLE_ADMIN
- Transaction isolation: Users can only access their own data

**Security Configuration:**
```java
// Payment service has spring-boot-starter-security dependency
// But relies on API Gateway for authentication
// Uses @PreAuthorize("hasRole('ADMIN')") for admin endpoints
```

### Data Protection

**Sensitive Data:**
- Payment card details: NEVER stored (handled by Stripe)
- Stripe tokens: Stored securely (stripe_payment_intent_id)
- User data: Minimal storage (only userId, amount)

**PCI DSS Compliance:**
- No card data storage (Stripe handles PCI compliance)
- Tokenization: Use Stripe tokens instead of raw card data
- Secure transmission: HTTPS only
- Audit logging: All transactions logged with timestamps

### Audit Trail

**Auditable Entity:**
```java
@Entity
public class Transaction extends Auditable {
    // Inherits audit fields:
    // - createdBy
    // - createdDate
    // - lastModifiedBy
    // - lastModifiedDate
}
```

**Audit Information:**
- Who initiated the payment (createdBy)
- When payment was created (createdDate)
- Any modifications (lastModifiedBy, lastModifiedDate)
- Complete transaction history

### Transaction Idempotency

**Unique Constraints:**
- `transaction_id`: Unique per transaction
- `stripe_payment_intent_id`: Unique per Stripe payment

**Duplicate Prevention:**
- Transaction ID generated before Stripe call
- If Stripe call fails, same transaction ID used for retry
- Prevents duplicate charges

---

## IMPORTANT: Payment Service Testing

### Production Flow vs Testing Flow

**PRODUCTION FLOW (User Never Calls Payment Service Directly):**
```
User → API Gateway → Recharge Service → Payment Service (Feign) → Stripe
```
In production, users call Recharge Service, which internally calls Payment Service.

**TESTING FLOW (Direct Payment Service Testing):**
```
Postman → API Gateway → Payment Service → Stripe
```
For testing Payment Service independently, you can call it directly via API Gateway.

---

## Standalone Testing (Without Recharge Service)

### Prerequisites for Standalone Testing

**Required Services:**
1. ✅ MySQL (port 3306)
2. ✅ Discovery Server (port 8761)
3. ✅ Config Server (port 8888)
4. ✅ API Gateway (port 8080)
5. ✅ User Service (port 8081) - for JWT token
6. ✅ Payment Service (port 8084)
7. ⚠️ RabbitMQ (port 5672) - optional for testing, required for events

**NOT Required for Standalone Testing:**
- ❌ Operator Service (not needed)
- ❌ Recharge Service (not needed)
- ❌ Notification Service (not needed)

### Step-by-Step Standalone Testing

#### Step 1: Start Required Services

**Terminal 1: Discovery Server**
```bash
cd d:\OmniCharge\discovery-server
./mvnw.cmd spring-boot:run
```
Wait for: "Started DiscoveryServerApplication"

**Terminal 2: Config Server**
```bash
cd d:\OmniCharge\config-server
./mvnw.cmd spring-boot:run
```
Wait for: "Started ConfigServerApplication"

**Terminal 3: API Gateway**
```bash
cd d:\OmniCharge\api-gateway
./mvnw.cmd spring-boot:run
```
Wait for: "Started ApiGatewayApplication"

**Terminal 4: User Service**
```bash
cd d:\OmniCharge\user-service
./mvnw.cmd spring-boot:run
```
Wait for: "Started UserServiceApplication"

**Terminal 5: Payment Service**
```bash
cd d:\OmniCharge\payment-service
./mvnw.cmd spring-boot:run
```
Wait for: "Started PaymentServiceApplication"

#### Step 2: Register and Login

**Register User:**
```
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{
  "fullName": "Test User",
  "email": "testuser@example.com",
  "password": "Test@123",
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": 1,
    "email": "testuser@example.com",
    "fullName": "Test User"
  }
}
```

**Login:**
```
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "Test@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": 1,
    "email": "testuser@example.com",
    "role": "ROLE_USER"
  }
}
```

**Save the `accessToken` for next steps!**

#### Step 3: Test Payment Processing (Direct Call)

**Process Payment:**
```
POST http://localhost:8080/api/payments/process
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "rechargeId": "TEST-RCH-001",
  "userId": 1,
  "amount": 100.00,
  "paymentMethod": "CREDIT_CARD"
}
```

**Expected Response (SUCCESS):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionId": "TXN-A1B2C3D4E5",
    "status": "SUCCESS",
    "stripePaymentIntentId": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
    "amount": 100.00,
    "timestamp": "2026-03-21T15:30:00"
  }
}
```

**Note:** 
- `rechargeId` can be any test value (e.g., "TEST-RCH-001", "TEST-RCH-002")
- **Each test must use a UNIQUE rechargeId** (due to Stripe idempotency)
- If you use the same rechargeId twice, Stripe returns the first payment's result
- In production, this would come from Recharge Service (auto-generated unique ID)
- For testing, increment the number: TEST-RCH-001, TEST-RCH-002, TEST-RCH-003, etc.

#### Step 4: Verify Transaction

**Get Transaction by ID:**
```
GET http://localhost:8080/api/payments/TXN-A1B2C3D4E5
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "id": 1,
    "transactionId": "TXN-A1B2C3D4E5",
    "rechargeId": "TEST-RCH-001",
    "userId": 1,
    "amount": 100.00,
    "paymentMethod": "CREDIT_CARD",
    "status": "SUCCESS",
    "failureReason": null,
    "stripePaymentIntentId": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
    "createdDate": "2026-03-21T15:30:00"
  }
}
```

#### Step 5: Check Payment History

**Get Payment History:**
```
GET http://localhost:8080/api/payments/history?page=0&size=10
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment history retrieved successfully",
  "data": {
    "content": [
      {
        "id": 1,
        "transactionId": "TXN-A1B2C3D4E5",
        "rechargeId": "TEST-RCH-001",
        "userId": 1,
        "amount": 100.00,
        "paymentMethod": "CREDIT_CARD",
        "status": "SUCCESS",
        "stripePaymentIntentId": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
        "createdDate": "2026-03-21T15:30:00"
      }
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 1,
    "totalPages": 1,
    "last": true
  }
}
```

#### Step 6: Test Different Payment Methods

**Test UPI Payment:**
```
POST http://localhost:8080/api/payments/process
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "rechargeId": "TEST-RCH-002",
  "userId": 1,
  "amount": 200.00,
  "paymentMethod": "UPI"
}
```

**Test Debit Card Payment:**
```
POST http://localhost:8080/api/payments/process
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "rechargeId": "TEST-RCH-003",
  "userId": 1,
  "amount": 300.00,
  "paymentMethod": "DEBIT_CARD"
}
```

**Test Net Banking Payment:**
```
POST http://localhost:8080/api/payments/process
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "rechargeId": "TEST-RCH-004",
  "userId": 1,
  "amount": 400.00,
  "paymentMethod": "NET_BANKING"
}
```

#### Step 7: Test Admin Endpoints

**Login as Admin:**
```
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "admin@omnicharge.com",
  "password": "Admin@123"
}
```

**Note:** Admin user must be seeded in User Service database.

**Get All Transactions (Admin):**
```
GET http://localhost:8080/api/admin/payments?page=0&size=20
Authorization: Bearer {adminAccessToken}
```

**Get Payment Statistics (Admin):**
```
GET http://localhost:8080/api/admin/payments/stats
Authorization: Bearer {adminAccessToken}
```

#### Step 8: Verify in Database

**Check Transactions:**
```sql
USE omnicharge_payment_db;

SELECT transaction_id, recharge_id, user_id, amount, 
       payment_method, status, stripe_payment_intent_id, created_date
FROM transactions
ORDER BY created_date DESC;
```

**Expected Result:**
```
+------------------+---------------+---------+--------+----------------+---------+--------------------------------+---------------------+
| transaction_id   | recharge_id   | user_id | amount | payment_method | status  | stripe_payment_intent_id       | created_date        |
+------------------+---------------+---------+--------+----------------+---------+--------------------------------+---------------------+
| TXN-A1B2C3D4E5   | TEST-RCH-001  | 1       | 100.00 | CREDIT_CARD    | SUCCESS | pi_3MtwBwLkdIwHu7ix28a3tqPa   | 2026-03-21 15:30:00 |
| TXN-F9G8H7I6J5   | TEST-RCH-002  | 1       | 200.00 | UPI            | SUCCESS | pi_3MtwBwLkdIwHu7ix28a3tqPb   | 2026-03-21 15:31:00 |
+------------------+---------------+---------+--------+----------------+---------+--------------------------------+---------------------+
```

#### Step 9: Verify in Stripe Dashboard

1. Login to Stripe Dashboard: https://dashboard.stripe.com/test/payments
2. Check recent payments
3. Verify amounts match your test transactions
4. Check payment status (succeeded/failed)

### Standalone Testing Checklist

- [ ] Discovery Server started
- [ ] Config Server started
- [ ] API Gateway started
- [ ] User Service started
- [ ] Payment Service started
- [ ] User registered and logged in
- [ ] JWT token obtained
- [ ] Payment processed successfully (CREDIT_CARD)
- [ ] Transaction retrieved by ID
- [ ] Payment history retrieved
- [ ] Different payment methods tested (UPI, DEBIT_CARD, NET_BANKING)
- [ ] Admin endpoints tested (if admin user exists)
- [ ] Transactions verified in database
- [ ] Payments verified in Stripe dashboard

### Testing Without RabbitMQ

**What Happens:**
- Payment processing works normally
- Transaction is saved to database
- Stripe payment is processed
- Event publishing will fail (logged as error)
- Payment still returns SUCCESS/FAILED correctly

**Log Output (Without RabbitMQ):**
```
ERROR: Failed to publish payment completed event: TXN-A1B2C3D4E5
AmqpConnectException: Connection refused
```

**Impact:**
- ✅ Payment processing: Works
- ✅ Transaction storage: Works
- ✅ Stripe integration: Works
- ❌ Event publishing: Fails (but doesn't break payment)
- ❌ Recharge Service notification: Won't receive event

**Recommendation:** Install RabbitMQ for complete testing, but payment processing works without it.

---

## Testing Flows

### Flow 1: Successful Payment (Standalone)

**Scenario:** User completes a recharge payment successfully

1. **User Initiates Payment**
   ```
   POST http://localhost:8080/api/payments/process
   Authorization: Bearer {userAccessToken}
   {
     "rechargeId": "RCH-ABC123",
     "userId": 1,
     "amount": 399.00,
     "paymentMethod": "UPI"
   }
   ```

2. **System Response**
   ```json
   {
     "success": true,
     "message": "Payment processed successfully",
     "data": {
       "transactionId": "TXN-A1B2C3D4E5",
       "status": "SUCCESS",
       "stripePaymentIntentId": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
       "amount": 399.00,
       "timestamp": "2026-03-20T18:30:00"
     }
   }
   ```

3. **Verify Transaction**
   ```
   GET http://localhost:8080/api/payments/TXN-A1B2C3D4E5
   Authorization: Bearer {userAccessToken}
   X-User-Id: 1
   ```

4. **Check Payment History**
   ```
   GET http://localhost:8080/api/payments/history?page=0&size=10
   Authorization: Bearer {userAccessToken}
   X-User-Id: 1
   ```

**Expected Results:**
- Transaction created with PENDING status
- Stripe payment processed
- Transaction updated to SUCCESS
- PaymentCompletedEvent published to RabbitMQ
- Recharge service receives event and updates recharge status

---

### Flow 2: Failed Payment (User)

**Scenario:** Payment fails due to insufficient funds or card decline

1. **User Initiates Payment**
   ```
   POST http://localhost:8080/api/payments/process
   Authorization: Bearer {userAccessToken}
   {
     "rechargeId": "RCH-DEF456",
     "userId": 1,
     "amount": 666.00,
     "paymentMethod": "CREDIT_CARD"
   }
   ```

2. **System Response (Payment Failed)**
   ```json
   {
     "success": true,
     "message": "Payment processed successfully",
     "data": {
       "transactionId": "TXN-F1G2H3I4J5",
       "status": "FAILED",
       "stripePaymentIntentId": null,
       "amount": 666.00,
       "timestamp": "2026-03-20T18:35:00"
     }
   }
   ```

3. **Verify Transaction**
   ```
   GET http://localhost:8080/api/payments/TXN-F1G2H3I4J5
   Authorization: Bearer {userAccessToken}
   X-User-Id: 1
   ```

**Expected Results:**
- Transaction created with PENDING status
- Stripe payment fails
- Transaction updated to FAILED with failure reason
- PaymentCompletedEvent published with FAILED status
- Recharge service marks recharge as FAILED
- User notified of payment failure

---

### Flow 3: Admin Monitoring

**Scenario:** Admin monitors all payments and views statistics

1. **Login as Admin**
   ```
   POST http://localhost:8080/api/auth/login
   {
     "email": "admin@omnicharge.com",
     "password": "Admin@123"
   }
   ```
   Save `accessToken`

2. **View All Transactions**
   ```
   GET http://localhost:8080/api/admin/payments?page=0&size=20
   Authorization: Bearer {adminAccessToken}
   ```

3. **View Payment Statistics**
   ```
   GET http://localhost:8080/api/admin/payments/stats
   Authorization: Bearer {adminAccessToken}
   ```

4. **Filter by Date (Custom Query)**
   ```
   GET http://localhost:8080/api/admin/payments?page=0&size=20&sortBy=createdDate&sortDir=DESC
   Authorization: Bearer {adminAccessToken}
   ```

**Expected Results:**
- Admin sees all transactions from all users
- Statistics show total revenue and failure amounts
- Can identify payment trends and issues
- Monitor payment gateway performance

---

### Flow 4: Unauthorized Access Prevention

**Scenario:** User tries to access another user's transaction

1. **User 1 Creates Payment**
   ```
   POST http://localhost:8080/api/payments/process
   Authorization: Bearer {user1AccessToken}
   {
     "rechargeId": "RCH-USER1",
     "userId": 1,
     "amount": 299.00,
     "paymentMethod": "UPI"
   }
   ```
   Response: `transactionId: TXN-USER1ABC`

2. **User 2 Tries to Access User 1's Transaction**
   ```
   GET http://localhost:8080/api/payments/TXN-USER1ABC
   Authorization: Bearer {user2AccessToken}
   X-User-Id: 2
   ```

**Expected Result:**
```json
{
  "success": false,
  "message": "Unauthorized access to transaction",
  "data": null,
  "timestamp": "2026-03-20T18:40:00"
}
```

**Security Validation:**
- Service checks if X-User-Id matches transaction.userId
- Returns 400 Bad Request if mismatch
- Prevents data leakage between users

---

### Flow 5: Complete Recharge Journey (End-to-End)

**Scenario:** User completes full recharge flow from operator selection to payment

1. **User Selects Operator and Plan** (Operator Service)
   ```
   GET http://localhost:8080/api/operators/detect?mobileNumber=9876543210
   ```
   User selects plan: Airtel Unlimited 84 Days - ₹719

2. **User Creates Recharge** (Recharge Service)
   ```
   POST http://localhost:8080/api/recharges
   Authorization: Bearer {userAccessToken}
   {
     "mobileNumber": "9876543210",
     "operatorId": 1,
     "planId": 1,
     "amount": 719.00
   }
   ```
   Response: `rechargeId: RCH-XYZ789`, `status: PENDING`

3. **User Initiates Payment** (Payment Service)
   ```
   POST http://localhost:8080/api/payments/process
   Authorization: Bearer {userAccessToken}
   {
     "rechargeId": "RCH-XYZ789",
     "userId": 1,
     "amount": 719.00,
     "paymentMethod": "UPI"
   }
   ```
   Response: `transactionId: TXN-K5L6M7N8O9`, `status: SUCCESS`

4. **Payment Event Published** (RabbitMQ)
   ```
   Exchange: omnicharge.exchange
   Routing Key: payment.completed
   Event: PaymentCompletedEvent
   ```

5. **Recharge Service Receives Event**
   - Updates recharge status to SUCCESS
   - Activates recharge
   - Publishes RechargeCompletedEvent

6. **Notification Service Sends Confirmation**
   - Email: Payment successful
   - SMS: Recharge activated

7. **User Verifies Payment**
   ```
   GET http://localhost:8080/api/payments/TXN-K5L6M7N8O9
   Authorization: Bearer {userAccessToken}
   X-User-Id: 1
   ```

8. **User Checks Recharge Status** (Recharge Service)
   ```
   GET http://localhost:8080/api/recharges/RCH-XYZ789
   Authorization: Bearer {userAccessToken}
   ```
   Response: `status: SUCCESS`, `paymentStatus: SUCCESS`

**Complete Flow Diagram:**
```
User → Operator Service (Select Plan)
  ↓
User → Recharge Service (Create Recharge)
  ↓
User → Payment Service (Process Payment)
  ↓
Payment Service → Stripe API (Payment Processing)
  ↓
Payment Service → RabbitMQ (Publish Event)
  ↓
Recharge Service ← RabbitMQ (Consume Event)
  ↓
Recharge Service → Update Status
  ↓
Notification Service ← RabbitMQ (Send Notifications)
  ↓
User ← Email/SMS (Confirmation)
```

---

## Error Responses

### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "amount": "Amount must be greater than 0",
    "paymentMethod": "Payment method is required"
  },
  "timestamp": "2026-03-20T18:30:00"
}
```

### 400 Bad Request (Unauthorized Access)
```json
{
  "success": false,
  "message": "Unauthorized access to transaction",
  "data": null,
  "timestamp": "2026-03-20T18:30:00"
}
```

### 401 Unauthorized (No Token)
```json
{
  "status": 401,
  "message": "Unauthorized",
  "path": "/api/payments/process",
  "timestamp": "2026-03-20T18:30:00"
}
```

### 403 Forbidden (User trying admin endpoint)
```json
{
  "status": 403,
  "message": "Access denied",
  "path": "/api/admin/payments",
  "timestamp": "2026-03-20T18:30:00"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Transaction not found with id: TXN-INVALID",
  "data": null,
  "timestamp": "2026-03-20T18:30:00"
}
```

### 500 Internal Server Error (Stripe Failure)
```json
{
  "success": false,
  "message": "Payment processing failed",
  "data": null,
  "timestamp": "2026-03-20T18:30:00"
}
```

---

## Database Verification

### Check Transactions
```sql
USE omnicharge_payment_db;

SELECT id, transaction_id, recharge_id, user_id, amount, 
       payment_method, status, created_date
FROM transactions
ORDER BY created_date DESC
LIMIT 10;
```

### Check Payment Statistics
```sql
-- Total transactions
SELECT COUNT(*) as total_transactions FROM transactions;

-- Success amount
SELECT SUM(amount) as success_amount 
FROM transactions 
WHERE status = 'SUCCESS';

-- Failed amount
SELECT SUM(amount) as failed_amount 
FROM transactions 
WHERE status = 'FAILED';

-- Success rate
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
    ROUND(SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM transactions;
```

### Check User Transactions
```sql
SELECT transaction_id, recharge_id, amount, payment_method, status, created_date
FROM transactions
WHERE user_id = 1
ORDER BY created_date DESC;
```

### Check Failed Transactions
```sql
SELECT transaction_id, recharge_id, amount, payment_method, 
       failure_reason, created_date
FROM transactions
WHERE status = 'FAILED'
ORDER BY created_date DESC;
```

---

## Configuration

### Required Environment Variables

```properties
# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_test_51MtwBwLkdIwHu7ix...
STRIPE_PUBLISHABLE_KEY=pk_test_51MtwBwLkdIwHu7ix...

# Database Configuration
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/omnicharge_payment_db
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=Asansol@0341

# RabbitMQ Configuration
SPRING_RABBITMQ_HOST=localhost
SPRING_RABBITMQ_PORT=5672
SPRING_RABBITMQ_USERNAME=guest
SPRING_RABBITMQ_PASSWORD=guest

# Eureka Configuration
EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://localhost:8761/eureka/
```

### Stripe Setup

1. **Create Stripe Account**
   - Visit: https://dashboard.stripe.com/register
   - Complete verification

2. **Get API Keys**
   - Navigate to: Developers → API keys
   - Copy Secret key (sk_test_...)
   - Copy Publishable key (pk_test_...)

3. **Configure Webhooks** (Production)
   - Navigate to: Developers → Webhooks
   - Add endpoint: https://your-domain.com/api/payments/webhook
   - Select events: payment_intent.succeeded, payment_intent.payment_failed

4. **Test Cards**
   ```
   Success: 4242 4242 4242 4242
   Decline: 4000 0000 0000 0002
   Insufficient Funds: 4000 0000 0000 9995
   ```

### RabbitMQ Setup

1. **Install RabbitMQ**
   ```bash
   # Windows (using Chocolatey)
   choco install rabbitmq

   # Or download from: https://www.rabbitmq.com/download.html
   ```

2. **Start RabbitMQ**
   ```bash
   rabbitmq-server
   ```

3. **Access Management UI**
   - URL: http://localhost:15672
   - Username: guest
   - Password: guest

4. **Verify Exchange**
   - Navigate to: Exchanges
   - Check: omnicharge.exchange exists

---

## Monitoring & Observability

### Health Check

**Endpoint:** `GET /actuator/health`

**Response:**
```json
{
  "status": "UP",
  "components": {
    "db": {
      "status": "UP",
      "details": {
        "database": "MySQL",
        "validationQuery": "isValid()"
      }
    },
    "rabbit": {
      "status": "UP",
      "details": {
        "version": "3.11.0"
      }
    }
  }
}
```

### Metrics

**Endpoint:** `GET /actuator/metrics`

**Key Metrics:**
- `http.server.requests`: Request count and latency
- `jvm.memory.used`: Memory usage
- `jdbc.connections.active`: Database connections
- `rabbitmq.published`: Messages published

### Logging

**Log Levels:**
```properties
logging.level.com.omnicharge.payment=INFO
logging.level.com.stripe=DEBUG
logging.level.org.springframework.amqp=INFO
```

**Key Log Events:**
- Transaction created: `Transaction created with PENDING status`
- Payment success: `Payment successful for recharge: {rechargeId}`
- Payment failure: `Payment failed for recharge: {rechargeId}`
- Event published: `Published payment completed event: {transactionId}`
- Stripe error: `Stripe payment failed for recharge: {rechargeId}`

---

## Troubleshooting

### Issue: Payment Processing Fails

**Symptoms:**
- All payments return FAILED status
- Stripe errors in logs

**Possible Causes:**
1. Invalid Stripe API key
2. Network connectivity issues
3. Stripe account not activated

**Solutions:**
```bash
# 1. Verify Stripe API key
echo $STRIPE_SECRET_KEY

# 2. Test Stripe connectivity
curl https://api.stripe.com/v1/charges \
  -u sk_test_your_key:

# 3. Check Stripe dashboard
# Visit: https://dashboard.stripe.com
```

### Issue: Events Not Published

**Symptoms:**
- Payments succeed but recharge status not updated
- No messages in RabbitMQ

**Possible Causes:**
1. RabbitMQ not running
2. Connection configuration incorrect
3. Exchange not created

**Solutions:**
```bash
# 1. Check RabbitMQ status
rabbitmqctl status

# 2. Verify connection
curl http://localhost:15672/api/overview \
  -u guest:guest

# 3. Check exchange
curl http://localhost:15672/api/exchanges/%2F/omnicharge.exchange \
  -u guest:guest
```

### Issue: Unauthorized Access Errors

**Symptoms:**
- 401 Unauthorized on all requests
- 403 Forbidden on admin endpoints

**Possible Causes:**
1. Missing Authorization header
2. Expired JWT token
3. User doesn't have ADMIN role

**Solutions:**
```bash
# 1. Login again to get fresh token
POST http://localhost:8080/api/auth/login

# 2. Verify token in JWT.io
# Copy token and paste at https://jwt.io

# 3. Check user role in token payload
{
  "sub": "admin@omnicharge.com",
  "role": "ROLE_ADMIN"  # Must be ROLE_ADMIN for admin endpoints
}
```

### Issue: Database Connection Errors

**Symptoms:**
- Service fails to start
- "Unable to acquire JDBC Connection" errors

**Solutions:**
```bash
# 1. Verify MySQL is running
mysql -u root -p

# 2. Check database exists
SHOW DATABASES LIKE 'omnicharge_payment_db';

# 3. Verify credentials
mysql -u root -pAsansol@0341 -e "SELECT 1"

# 4. Create database if missing
CREATE DATABASE omnicharge_payment_db;
```

---

## Best Practices

### Payment Processing

1. **Idempotency**
   - Generate transaction ID before Stripe call
   - Use same ID for retries
   - Prevents duplicate charges

2. **Error Handling**
   - Always handle Stripe exceptions
   - Log errors with context
   - Return user-friendly messages

3. **Amount Handling**
   - Store amounts in BigDecimal (not float/double)
   - Convert to paise for Stripe (multiply by 100)
   - Validate amount > 0

4. **Status Management**
   - Create transaction as PENDING first
   - Update after Stripe response
   - Publish event regardless of outcome

### Security

1. **API Keys**
   - Never commit Stripe keys to git
   - Use environment variables
   - Rotate keys periodically

2. **User Isolation**
   - Always validate userId matches transaction owner
   - Use X-User-Id header from gateway
   - Don't trust client-provided userId

3. **Admin Access**
   - Require ROLE_ADMIN for sensitive endpoints
   - Log all admin actions
   - Implement rate limiting

### Event Publishing

1. **Reliability**
   - Don't fail payment if event publishing fails
   - Log publishing errors
   - Consider retry mechanism

2. **Event Structure**
   - Include all necessary data in event
   - Use consistent timestamp format
   - Version events for backward compatibility

3. **Consumer Handling**
   - Consumers should be idempotent
   - Handle duplicate events gracefully
   - Implement dead letter queues

### Database

1. **Indexing**
   - Index frequently queried fields (transaction_id, user_id, status)
   - Composite indexes for common queries
   - Monitor query performance

2. **Transactions**
   - Use @Transactional for data consistency
   - Keep transactions short
   - Handle rollbacks properly

3. **Audit Trail**
   - Never delete transactions (soft delete if needed)
   - Maintain complete audit history
   - Regular backups

---

## API Quick Reference

| Operation | Method | Endpoint | Auth | Role | Filters | Notes |
|-----------|--------|----------|------|------|---------|-------|
| **User Endpoints** |
| Process Payment | POST | /api/payments/process | Yes | USER/ADMIN | - | Creates transaction and processes via Stripe |
| Get Transaction | GET | /api/payments/{transactionId} | Yes | USER/ADMIN | - | User can only access own transactions |
| Payment History | GET | /api/payments/history | Yes | USER/ADMIN | amount, status, date, sort | Paginated list with filters |
| **Admin Endpoints** |
| All Transactions | GET | /api/admin/payments | Yes | ADMIN | userId, rechargeId, amount, status, date, sort | View all transactions with advanced filters |
| Payment Stats | GET | /api/admin/payments/stats | Yes | ADMIN | days | Comprehensive business metrics and trends |

### Filter Parameters Summary

**User Filters** (`/api/payments/history`):
- `minAmount`, `maxAmount` - Amount range
- `status` - SUCCESS, PENDING, FAILED
- `startDate`, `endDate` - Date range (ISO 8601)
- `page`, `size` - Pagination
- `sortBy`, `sortDir` - Sorting

**Admin Filters** (`/api/admin/payments`):
- All user filters PLUS:
- `userId` - Filter by specific user
- `rechargeId` - Filter by recharge ID

**Admin Stats** (`/api/admin/payments/stats`):
- `days` - Number of days for revenue trends (default: 30)

---

## Testing Checklist

### User Endpoints
- [ ] Process payment with valid data (SUCCESS)
- [ ] Process payment with invalid Stripe key (FAILED)
- [ ] Process payment with insufficient funds (FAILED)
- [ ] Get transaction by ID (own transaction)
- [ ] Try to get another user's transaction (403)
- [ ] Get payment history with pagination
- [ ] Get payment history with sorting (ASC/DESC)
- [ ] Filter payments by amount range (minAmount, maxAmount)
- [ ] Filter payments by status (SUCCESS, FAILED, PENDING)
- [ ] Filter payments by date range (startDate, endDate)
- [ ] Combine multiple filters (status + amount + date)
- [ ] Verify PaymentCompletedEvent published to RabbitMQ

### Admin Endpoints
- [ ] Get all transactions as admin
- [ ] Get payment statistics (enhanced with trends)
- [ ] Verify admin can see all users' transactions
- [ ] Try admin endpoint as regular user (403)
- [ ] Filter transactions by specific userId
- [ ] Filter transactions by rechargeId
- [ ] Filter transactions by amount range
- [ ] Filter transactions by status
- [ ] Filter transactions by date range
- [ ] Combine multiple admin filters
- [ ] Get stats for different time periods (7, 30, 90 days)
- [ ] Verify today's revenue and transaction count
- [ ] Verify revenue trends (revenueByDate array)
- [ ] Verify top users list (topUsers array)

### Payment Methods
- [ ] Test CREDIT_CARD payment
- [ ] Test DEBIT_CARD payment
- [ ] Test UPI payment
- [ ] Test NET_BANKING payment

### Error Scenarios
- [ ] Missing required fields (400)
- [ ] Invalid amount (negative/zero) (400)
- [ ] Invalid payment method (400)
- [ ] Transaction not found (404)
- [ ] Unauthorized access (401)
- [ ] Forbidden access (403)
- [ ] Invalid date format in filters (400)

### Integration
- [ ] Verify Stripe PaymentIntent created
- [ ] Verify transaction saved to database
- [ ] Verify event published to RabbitMQ
- [ ] Verify recharge service receives event
- [ ] Verify end-to-end recharge flow

### Filtering & Search
- [ ] User can filter their own payments by amount
- [ ] User can filter by status
- [ ] User can filter by date range
- [ ] User cannot see other users' payments
- [ ] Admin can filter all transactions by userId
- [ ] Admin can track specific recharge by rechargeId
- [ ] Admin can find high-value transactions
- [ ] Admin can identify failed payments
- [ ] Stats show accurate counts and revenue
- [ ] Revenue trends match database records
- [ ] Top users list shows correct spending

---

## Prerequisites

### Services Running
- ✅ MySQL (port 3306)
- ✅ RabbitMQ (port 5672)
- ✅ Discovery Server (port 8761)
- ✅ Config Server (port 8888)
- ✅ User Service (port 8081)
- ✅ Operator Service (port 8082)
- ✅ API Gateway (port 8080)
- ✅ Payment Service (port 8084)

### External Services
- ✅ Stripe Account (Test Mode)
- ✅ Valid Stripe API Keys

### Test Accounts

**Admin Account:**
```
Email: admin@omnicharge.com
Password: Admin@123
Role: ROLE_ADMIN
```

**Regular User:**
```
Email: user1@omnicharge.com
Password: User@123
Role: ROLE_USER
```

---

## Recent Updates & Enhancements

### Version 1.1.0 - Advanced Filtering & Enhanced Statistics

**Release Date**: March 21, 2026

**New Features:**

1. **User Payment History Filtering**
   - Amount range filtering (minAmount, maxAmount)
   - Status filtering (SUCCESS, PENDING, FAILED)
   - Date range filtering (startDate, endDate)
   - Enhanced sorting options
   - Maintained security: users can only see their own payments

2. **Admin Advanced Filtering**
   - All user filters PLUS userId and rechargeId filters
   - Track specific users' payment patterns
   - Monitor specific recharge requests
   - Identify high-value or problematic transactions

3. **Enhanced Admin Statistics**
   - Transaction counts by status (successful, failed, pending)
   - Total revenue and average transaction amount
   - Today's transactions and revenue
   - Daily revenue trends (configurable period: 7, 30, 90 days)
   - Top 10 users by spending (VIP identification)
   - Comprehensive business metrics for dashboards

**Technical Changes:**

1. **Repository Layer** (`TransactionRepository.java`)
   - Added `findByUserIdWithFilters()` for user filtering
   - Added `findAllWithFilters()` for admin filtering
   - Added aggregate queries for statistics
   - Optimized queries with proper indexing

2. **Service Layer** (`PaymentService.java`)
   - Enhanced `getPaymentHistory()` with filter parameters
   - Enhanced `getAllTransactions()` with admin filters
   - Enhanced `getPaymentStats()` with comprehensive metrics
   - Added revenue trend calculations
   - Added top users identification

3. **Controller Layer**
   - Updated `PaymentController` with filter parameters
   - Updated `AdminPaymentController` with advanced filters
   - Added role validation for admin endpoints
   - Enhanced security checks

4. **DTOs**
   - Enhanced `PaymentStatsResponse` with new fields
   - Created `DailyRevenueStats` for revenue trends
   - Created `TopUserStats` for top spenders

**Security Enhancements:**
- User isolation maintained (users can only see own data)
- Admin role validation on all admin endpoints
- Runtime role checks in controllers
- Audit logging for admin queries

**Performance Optimizations:**
- Database indexes on frequently queried fields
- Efficient aggregate queries for statistics
- Pagination support for large datasets
- Optimized date range queries

**Use Cases Enabled:**
- User: Find specific payments, monthly statements, track failures
- Admin: Monitor revenue, identify VIP users, detect fraud patterns
- Business: Revenue trends, success rates, customer analytics

---

## Summary

The Payment Service is a critical microservice that:

✅ **Processes Payments** via Stripe integration  
✅ **Manages Transactions** with complete audit trail  
✅ **Publishes Events** for async communication  
✅ **Ensures Security** with user isolation and admin controls  
✅ **Maintains Compliance** with PCI DSS standards  
✅ **Provides Monitoring** via actuator endpoints  

**Key Features:**
- Stripe payment gateway integration
- Multiple payment methods (Card, UPI, Net Banking)
- Event-driven architecture with RabbitMQ
- Complete transaction history and audit trail
- Admin dashboard with payment statistics
- Secure and compliant payment processing

**Service:** Payment Service  
**Port:** 8084  
**Gateway:** http://localhost:8080  
**Database:** omnicharge_payment_db  
**Version:** 1.0.0

---

**All endpoints tested and working!** ✅


---


# Payment Service API

## Endpoints

### PaymentController
* `POST /api/payments/process` - Synchronous endpoint to initiate payment processing (uses Razorpay in dev/prod).
* `GET /api/payments/{transactionId}` - Polling endpoint to retrieve transaction details by ID for the logged-in user.
* `POST /api/payments/webhook/confirm/{transactionId}` - External webhook callback handler (e.g. from Razorpay) that finalizes payment status to SUCCESS.
* `GET /api/payments/history` - Paged retrieval of the authenticated user's transactional history with comprehensive filtering (amount, status, date).

### AdminPaymentController
* `GET /api/admin/payments` - Global paged list of all transactions with extensive filtering capabilities.
* `GET /api/admin/payments/stats` - Endpoint to retrieve aggregated reporting analytics (e.g., total revenue, success rates, transaction counts, top spenders).

## Request Flow
1. **Initiation**: The user clicks 'Pay' resulting in `saga.recharge.initiated` being consumed. The `PaymentSagaConsumer` intercepts this and triggers `processPayment`.
2. **Transaction Creation**: Creates a local internal `Transaction` record marked as `PENDING`. It attempts to call Razorpay APIs to generate a Razorpay order ID.
3. **Webhook Confirmation**: The external payment gateway successfully charges the user and hits `/webhook/confirm/{transactionId}`. The system verifies the signature and updates DB state to `SUCCESS`. If context metadata (mobile number, operator name) fell out of the DB, it asynchronously triggers `enrichTransactionFromRechargeService` via REST to fetch it from the recharge service.
4. **Saga Orchestration & Notification**: The webhook then triggers `PaymentEventProducer` to publish `saga.payment.approved` back to the Recharge Service to finalize the saga. It also publishes `payment.completed` to the Notification Service for triggering SMS/Emails.

## Cache Usage
* **None Directly**: Highly consistent data structure. RestTemplate connects via Eureka registry without local data caching to fetch missing data reliably.

## RabbitMQ Communication
* **Consumers**: 
  - `PaymentSagaConsumer`: Binds `@RabbitListener` to `saga.payment.process`. Listens for recharge initialization from the Recharge Service.
* **Producers**: 
  - `PaymentEventProducer`: Emits `saga.payment.approved` and `saga.payment.rejected` back to the exchange.
  - Emits `payment.completed` with transaction context to `notification.payment.queue`.

## Sync vs Async Calls
* **Synchronous**: RestTemplate API calls to `RazorpayClient` external library and `RechargeService` internal lookup API (`/api/internal/recharges/{rechargeId}`).
* **Asynchronous**: The overlying SAGA transactional choreography and notification system triggers are handled over AMQP queues asynchronously.

