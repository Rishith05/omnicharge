# Payment Service - Standalone Testing Guide

## Date: 2026-03-21

---

## Overview

This guide shows how to test Payment Service **independently** without Recharge Service.

**Why Test Standalone?**
- Verify Payment Service works correctly
- Test Stripe integration
- Debug payment issues
- Faster testing (fewer services to run)

---

## Required Services (5 Only)

### 1. Discovery Server (Port 8761)
```bash
cd d:\OmniCharge\discovery-server
./mvnw.cmd spring-boot:run
```
Wait for: "Started DiscoveryServerApplication"

### 2. Config Server (Port 8888)
```bash
cd d:\OmniCharge\config-server
./mvnw.cmd spring-boot:run
```
Wait for: "Started ConfigServerApplication"

### 3. API Gateway (Port 8080)
```bash
cd d:\OmniCharge\api-gateway
./mvnw.cmd spring-boot:run
```
Wait for: "Started ApiGatewayApplication"

### 4. User Service (Port 8081)
```bash
cd d:\OmniCharge\user-service
./mvnw.cmd spring-boot:run
```
Wait for: "Started UserServiceApplication"

### 5. Payment Service (Port 8084)
```bash
cd d:\OmniCharge\payment-service
./mvnw.cmd spring-boot:run
```
Wait for: "Started PaymentServiceApplication"

---

## NOT Required for Standalone Testing

- ❌ Operator Service
- ❌ Recharge Service
- ❌ Notification Service
- ⚠️ RabbitMQ (optional - payment works without it, but events won't publish)

---

## Testing Steps

### Step 1: Register User

**Request:**
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
    "email": "testuser@example.com"
  }
}
```

---

### Step 2: Login

**Request:**
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
    "userId": 1,
    "role": "ROLE_USER"
  }
}
```

**SAVE THE ACCESS TOKEN!**

---

### Step 3: Process Payment (Direct Call)

**Request:**
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

**Key Points:**
- `rechargeId`: Use any test value (e.g., "TEST-RCH-001", "TEST-RCH-002")
- `userId`: Must match your logged-in user ID
- `amount`: Any amount > 0 (in INR)
- `paymentMethod`: CREDIT_CARD, DEBIT_CARD, UPI, or NET_BANKING

**Response (SUCCESS):**
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

**Response (FAILED - if Stripe rejects):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transactionId": "TXN-F1G2H3I4J5",
    "status": "FAILED",
    "stripePaymentIntentId": null,
    "amount": 100.00,
    "timestamp": "2026-03-21T15:30:00"
  }
}
```

---

### Step 4: Get Transaction by ID

**Request:**
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
    "stripePaymentIntentId": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
    "createdDate": "2026-03-21T15:30:00"
  }
}
```

---

### Step 5: Get Payment History

**Request:**
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
        "transactionId": "TXN-A1B2C3D4E5",
        "rechargeId": "TEST-RCH-001",
        "amount": 100.00,
        "status": "SUCCESS",
        "createdDate": "2026-03-21T15:30:00"
      }
    ],
    "totalElements": 1
  }
}
```

---

## Test Different Payment Methods

### Test 1: Credit Card
```json
{
  "rechargeId": "TEST-RCH-001",
  "userId": 1,
  "amount": 100.00,
  "paymentMethod": "CREDIT_CARD"
}
```

### Test 2: UPI
```json
{
  "rechargeId": "TEST-RCH-002",
  "userId": 1,
  "amount": 200.00,
  "paymentMethod": "UPI"
}
```

### Test 3: Debit Card
```json
{
  "rechargeId": "TEST-RCH-003",
  "userId": 1,
  "amount": 300.00,
  "paymentMethod": "DEBIT_CARD"
}
```

### Test 4: Net Banking
```json
{
  "rechargeId": "TEST-RCH-004",
  "userId": 1,
  "amount": 400.00,
  "paymentMethod": "NET_BANKING"
}
```

---

## Verify in Database

```sql
USE omnicharge_payment_db;

-- Check all transactions
SELECT transaction_id, recharge_id, user_id, amount, 
       payment_method, status, created_date
FROM transactions
ORDER BY created_date DESC;

-- Check successful payments
SELECT COUNT(*) as success_count, SUM(amount) as total_amount
FROM transactions
WHERE status = 'SUCCESS';

-- Check failed payments
SELECT transaction_id, recharge_id, amount, failure_reason
FROM transactions
WHERE status = 'FAILED';
```

---

## Verify in Stripe Dashboard

1. Login: https://dashboard.stripe.com/test/payments
2. Check recent payments
3. Verify amounts match your tests
4. Check payment status

---

## Testing Without RabbitMQ

**What Works:**
- ✅ Payment processing
- ✅ Stripe integration
- ✅ Transaction storage
- ✅ All API endpoints

**What Doesn't Work:**
- ❌ Event publishing (logged as error)
- ❌ Recharge Service won't be notified

**Log Output:**
```
ERROR: Failed to publish payment completed event: TXN-A1B2C3D4E5
AmqpConnectException: Connection refused
```

**Impact:** Payment still succeeds, but event is not published.

---

## Common Issues

### Issue 1: 401 Unauthorized

**Cause:** Missing or invalid JWT token

**Solution:**
1. Login again to get fresh token
2. Copy the `accessToken` from login response
3. Add to Authorization header: `Bearer {accessToken}`

---

### Issue 2: Payment Always Fails

**Cause:** Invalid Stripe API key

**Solution:**
1. Check `payment-service/src/main/resources/application.properties`
2. Verify Stripe secret key is correct
3. Test key should start with `sk_test_`

---

### Issue 3: Service Won't Start

**Cause:** Port already in use or database connection failed

**Solution:**
```bash
# Check if port is in use
netstat -ano | findstr :8084

# Check MySQL connection
mysql -u root -pAsansol@0341 -e "SELECT 1"

# Check if database exists
mysql -u root -pAsansol@0341 -e "SHOW DATABASES LIKE 'omnicharge_payment_db'"
```

---

### Issue 4: Can't Access Another User's Transaction

**Cause:** This is correct behavior (security feature)

**Explanation:**
- Users can only access their own transactions
- X-User-Id header is validated
- Returns 400 Bad Request if mismatch

---

## Postman Collection

### Collection Structure

```
OmniCharge Payment Service
├── Auth
│   ├── Register User
│   └── Login User
├── Payment
│   ├── Process Payment (Credit Card)
│   ├── Process Payment (UPI)
│   ├── Process Payment (Debit Card)
│   ├── Process Payment (Net Banking)
│   ├── Get Transaction by ID
│   └── Get Payment History
└── Admin
    ├── Get All Transactions
    └── Get Payment Statistics
```

### Environment Variables

```
base_url: http://localhost:8080
access_token: {{accessToken}}
user_id: 1
```

---

## Testing Checklist

### Setup
- [ ] Discovery Server started
- [ ] Config Server started
- [ ] API Gateway started
- [ ] User Service started
- [ ] Payment Service started
- [ ] MySQL running
- [ ] Stripe keys configured

### User Flow
- [ ] User registered
- [ ] User logged in
- [ ] JWT token saved
- [ ] Payment processed (CREDIT_CARD)
- [ ] Transaction retrieved by ID
- [ ] Payment history retrieved

### Payment Methods
- [ ] CREDIT_CARD payment tested
- [ ] UPI payment tested
- [ ] DEBIT_CARD payment tested
- [ ] NET_BANKING payment tested

### Verification
- [ ] Transactions in database
- [ ] Payments in Stripe dashboard
- [ ] Transaction IDs match
- [ ] Amounts match

### Error Scenarios
- [ ] Invalid amount (negative)
- [ ] Missing payment method
- [ ] Invalid transaction ID (404)
- [ ] Access another user's transaction (400)

---

## Summary

**Standalone Testing:**
- ✅ Requires only 5 services
- ✅ Tests Payment Service independently
- ✅ Verifies Stripe integration
- ✅ Faster than full system testing

**Limitations:**
- ⚠️ No real recharge flow (using test recharge IDs)
- ⚠️ Events not consumed (no Recharge Service)
- ⚠️ No notifications (no Notification Service)

**When to Use:**
- Testing Payment Service changes
- Debugging Stripe integration
- Verifying payment processing logic
- Quick smoke testing

**When to Use Full System:**
- End-to-end recharge flow
- Event-driven communication
- Complete user journey
- Production-like testing

---

**Status:** Ready for standalone testing  
**Services Required:** 5 (Discovery, Config, Gateway, User, Payment)  
**External Dependencies:** MySQL, Stripe (RabbitMQ optional)

