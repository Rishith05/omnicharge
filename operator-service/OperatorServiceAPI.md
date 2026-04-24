# Operator Service - Testing Guide

## Overview

The Operator Service manages mobile operators (Airtel, Jio, Vi, BSNL) and their recharge plans. It provides operator detection via mobile number and plan management capabilities.

**Port:** 8082  
**Database:** omnicharge_operator_db (MySQL)  
**Gateway URL:** http://localhost:8080

---

## Architecture

```
User → API Gateway (8080) → Operator Service (8082)
                ↓
         Validates JWT
         Adds Headers:
         - X-User-Id
         - X-User-Role
         - X-User-Email
```

**Authentication:** Trusts API Gateway headers (no local JWT validation)

---

## Prerequisites

### Services Running
- ✅ MySQL (port 3306)
- ✅ Redis (port 6379)
- ✅ Discovery Server (port 8761)
- ✅ Config Server (port 8888)
- ✅ User Service (port 8081)
- ✅ API Gateway (port 8080)
- ✅ Operator Service (port 8082)

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

## Seeded Data

### Operators (4 Total)

| ID | Name   | Code   | Category | Status |
|----|--------|--------|----------|--------|
| 1  | Airtel | AIRTEL | PREPAID  | Active |
| 2  | Jio    | JIO    | PREPAID  | Active |
| 3  | Vi     | VI     | PREPAID  | Active |
| 4  | BSNL   | BSNL   | PREPAID  | Active |

### Plans (8 Total)

**Airtel Plans:**
- Unlimited 84 Days - ₹719 (RECOMMENDED)
- Data Booster - ₹299 (DATA)
- Talktime Special - ₹199 (TALKTIME)

**Jio Plans:**
- Jio Unlimited - ₹666 (RECOMMENDED)
- Data Pack - ₹349 (DATA)

**Vi Plans:**
- Vi Hero Unlimited - ₹699 (UNLIMITED)
- Weekend Data - ₹249 (DATA)

---

## Enums

### OperatorCategory
```java
PREPAID
POSTPAID
```

### PlanCategory
```java
RECOMMENDED
DATA
UNLIMITED
TALKTIME
ROAMING
```

---

## API Endpoints

### Public Endpoints (No Authentication)

#### 1. Detect Operator by Mobile Number

**Endpoint:** `GET /api/operators/detect?mobileNumber={number}`

**Full URL:** `http://localhost:8080/api/operators/detect?mobileNumber=9876543210`

**Headers:** None required

**Query Parameters:**
- `mobileNumber` (required): 10-digit Indian mobile number

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Operator detected successfully",
  "data": {
    "operatorId": 1,
    "operatorName": "Airtel",
    "operatorCode": "AIRTEL",
    "logoUrl": "https://example.com/airtel-logo.png",
    "plans": [
      {
        "id": 1,
        "planName": "Unlimited 84 Days",
        "price": 719.00,
        "validityDays": 84,
        "category": "RECOMMENDED"
      }
    ]
  },
  "timestamp": "2026-03-20T11:00:00"
}
```

**Note:** Uses Numverify API for detection with fallback to prefix-based detection

---

#### 2. Get All Active Operators (Manual Selection)

**Endpoint:** `GET /api/operators/active`

**Full URL:** `http://localhost:8080/api/operators/active`

**Headers:** None required

**Use Case:** When auto-detection fails or user wants to manually select operator

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Active operators retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Airtel",
      "code": "AIRTEL",
      "category": "PREPAID",
      "logoUrl": "https://example.com/airtel-logo.png",
      "isActive": true,
      "planCount": 3
    },
    {
      "id": 2,
      "name": "Jio",
      "code": "JIO",
      "category": "PREPAID",
      "logoUrl": "https://example.com/jio-logo.png",
      "isActive": true,
      "planCount": 2
    },
    {
      "id": 3,
      "name": "Vi",
      "code": "VI",
      "category": "PREPAID",
      "logoUrl": "https://example.com/vi-logo.png",
      "isActive": true,
      "planCount": 2
    },
    {
      "id": 4,
      "name": "BSNL",
      "code": "BSNL",
      "category": "PREPAID",
      "logoUrl": "https://example.com/bsnl-logo.png",
      "isActive": true,
      "planCount": 1
    }
  ],
  "timestamp": "2026-03-20T11:00:00"
}
```

---

#### 3. Get Operator Details by ID

**Endpoint:** `GET /api/operators/{id}`

**Full URL:** `http://localhost:8080/api/operators/1`

**Headers:** None required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Operator retrieved successfully",
  "data": {
    "id": 1,
    "name": "Airtel",
    "code": "AIRTEL",
    "category": "PREPAID",
    "logoUrl": "https://example.com/airtel-logo.png",
    "isActive": true,
    "planCount": 3
  },
  "timestamp": "2026-03-20T11:00:00"
}
```

---

#### 4. Get Plan by ID

**Endpoint:** `GET /api/plans/{id}`

**Full URL:** `http://localhost:8080/api/plans/1`

**Headers:** None required

**Note:** This endpoint was made public (changed from authenticated to public) to:
- Allow users to browse plan details before registration/login
- Enable Recharge Service to validate plans via Feign client
- Improve user experience for plan discovery
- Similar to e-commerce sites showing product details without login

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Plan retrieved successfully",
  "data": {
    "id": 1,
    "operatorId": 1,
    "operatorName": "Airtel",
    "planName": "Unlimited 84 Days",
    "price": 719.00,
    "validityDays": 84,
    "dataLimit": "2GB/day",
    "callBenefit": "Unlimited",
    "smsBenefit": "100 SMS/day",
    "additionalBenefits": "Free Hellotunes",
    "category": "RECOMMENDED",
    "isActive": true
  },
  "timestamp": "2026-03-19T22:00:00"
}
```

---

### User Endpoints (Requires Authentication)

#### 5. Search Plans (Paginated)

**Endpoint:** `GET /api/plans/search`

**Full URL:** 
```
http://localhost:8080/api/plans/search?operatorId=1&category=DATA&minPrice=200&maxPrice=500&page=0&size=10&sortBy=price&sortDir=ASC
```

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `operatorId` (required): Operator ID
- `category` (optional): RECOMMENDED, DATA, UNLIMITED, TALKTIME, ROAMING
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `page` (optional, default: 0): Page number
- `size` (optional, default: 10): Page size
- `sortBy` (optional, default: price): Sort field
- `sortDir` (optional, default: ASC): ASC or DESC

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Plans retrieved successfully",
  "data": {
    "content": [
      {
        "id": 2,
        "operatorId": 1,
        "operatorName": "Airtel",
        "planName": "Data Booster",
        "price": 299.00,
        "validityDays": 28,
        "dataLimit": "1.5GB/day",
        "callBenefit": "Unlimited",
        "smsBenefit": "100 SMS/day",
        "additionalBenefits": "Disney+ Hotstar Mobile",
        "category": "DATA",
        "isActive": true
      }
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 1,
    "totalPages": 1
  },
  "timestamp": "2026-03-19T22:00:00"
}
```

---

### Admin Endpoints (Requires ROLE_ADMIN)

#### 6. Get All Operators

**Endpoint:** `GET /api/admin/operators`

**Full URL:** `http://localhost:8080/api/admin/operators`

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Operators retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Airtel",
      "code": "AIRTEL",
      "category": "PREPAID",
      "logoUrl": "https://example.com/airtel-logo.png",
      "isActive": true,
      "createdDate": "2026-03-19T10:00:00",
      "lastModifiedDate": "2026-03-19T10:00:00"
    },
    {
      "id": 2,
      "name": "Jio",
      "code": "JIO",
      "category": "PREPAID",
      "logoUrl": "https://example.com/jio-logo.png",
      "isActive": true,
      "createdDate": "2026-03-19T10:00:00",
      "lastModifiedDate": "2026-03-19T10:00:00"
    }
  ],
  "timestamp": "2026-03-19T22:00:00"
}
```

---

#### 7. Create Operator

**Endpoint:** `POST /api/admin/operators`

**Full URL:** `http://localhost:8080/api/admin/operators`

**Headers:**
```
Authorization: Bearer {admin_access_token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "MTNL",
  "code": "MTNL",
  "category": "PREPAID",
  "logoUrl": "https://example.com/mtnl-logo.png"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Operator created successfully",
  "data": {
    "id": 5,
    "name": "MTNL",
    "code": "MTNL",
    "category": "PREPAID",
    "logoUrl": "https://example.com/mtnl-logo.png",
    "isActive": true,
    "createdDate": "2026-03-19T22:00:00",
    "lastModifiedDate": "2026-03-19T22:00:00"
  },
  "timestamp": "2026-03-19T22:00:00"
}
```

**Validation Rules:**
- `name`: Required, not blank
- `code`: Required, not blank, unique
- `category`: Required (PREPAID or POSTPAID)
- `logoUrl`: Optional

---

#### 8. Update Operator

**Endpoint:** `PUT /api/admin/operators/{id}`

**Full URL:** `http://localhost:8080/api/admin/operators/5`

**Headers:**
```
Authorization: Bearer {admin_access_token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "MTNL Delhi",
  "code": "MTNL",
  "category": "PREPAID",
  "logoUrl": "https://example.com/mtnl-new-logo.png"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Operator updated successfully",
  "data": {
    "id": 5,
    "name": "MTNL Delhi",
    "code": "MTNL",
    "category": "PREPAID",
    "logoUrl": "https://example.com/mtnl-new-logo.png",
    "isActive": true,
    "createdDate": "2026-03-19T22:00:00",
    "lastModifiedDate": "2026-03-19T22:05:00"
  },
  "timestamp": "2026-03-19T22:05:00"
}
```

---

#### 9. Delete Operator

**Endpoint:** `DELETE /api/admin/operators/{id}`

**Full URL:** `http://localhost:8080/api/admin/operators/5`

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Operator deleted successfully",
  "data": null,
  "timestamp": "2026-03-19T22:10:00"
}
```

**Note:** Deleting an operator will also delete all associated plans (cascade delete)

---

#### 10. Create Plan for Operator

**Endpoint:** `POST /api/admin/operators/{operatorId}/plans`

**Full URL:** `http://localhost:8080/api/admin/operators/1/plans`

**Headers:**
```
Authorization: Bearer {admin_access_token}
Content-Type: application/json
```

**Body:**
```json
{
  "planName": "Super Saver Pack",
  "price": 399,
  "validityDays": 56,
  "dataLimit": "1GB/day",
  "callBenefit": "Unlimited",
  "smsBenefit": "100 SMS/day",
  "additionalBenefits": "Free subscription to Wynk Music",
  "category": "DATA"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Plan created successfully",
  "data": {
    "id": 9,
    "operatorId": 1,
    "operatorName": "Airtel",
    "planName": "Super Saver Pack",
    "price": 399.00,
    "validityDays": 56,
    "dataLimit": "1GB/day",
    "callBenefit": "Unlimited",
    "smsBenefit": "100 SMS/day",
    "additionalBenefits": "Free subscription to Wynk Music",
    "category": "DATA",
    "isActive": true
  },
  "timestamp": "2026-03-19T22:15:00"
}
```

**Validation Rules:**
- `planName`: Required, not blank
- `price`: Required, must be positive
- `validityDays`: Required, must be positive
- `category`: Required (RECOMMENDED, DATA, UNLIMITED, TALKTIME, ROAMING)
- Other fields: Optional

---

#### 11. Update Plan

**Endpoint:** `PUT /api/admin/operators/plans/{planId}`

**Full URL:** `http://localhost:8080/api/admin/operators/plans/9`

**Headers:**
```
Authorization: Bearer {admin_access_token}
Content-Type: application/json
```

**Body:**
```json
{
  "planName": "Super Saver Pack Updated",
  "price": 449,
  "validityDays": 56,
  "dataLimit": "1.5GB/day",
  "callBenefit": "Unlimited",
  "smsBenefit": "100 SMS/day",
  "additionalBenefits": "Free Wynk Music + Amazon Prime",
  "category": "RECOMMENDED"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Plan updated successfully",
  "data": {
    "id": 9,
    "operatorId": 1,
    "operatorName": "Airtel",
    "planName": "Super Saver Pack Updated",
    "price": 449.00,
    "validityDays": 56,
    "dataLimit": "1.5GB/day",
    "callBenefit": "Unlimited",
    "smsBenefit": "100 SMS/day",
    "additionalBenefits": "Free Wynk Music + Amazon Prime",
    "category": "RECOMMENDED",
    "isActive": true
  },
  "timestamp": "2026-03-19T22:20:00"
}
```

**Important:** This endpoint ONLY updates plan details (name, price, validity, etc.). It does NOT change the plan's active status. Use ACTIVATE/DEACTIVATE endpoints for status changes.

---

#### 12. Delete Plan

**Endpoint:** `DELETE /api/admin/operators/plans/{planId}`

**Full URL:** `http://localhost:8080/api/admin/operators/plans/9`

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Plan deleted successfully",
  "data": null,
  "timestamp": "2026-03-19T22:25:00"
}
```

**Note:** Soft delete - sets `isActive = false` and `deactivatedByOperator = false`

**Important:** This endpoint does the SAME thing as DEACTIVATE (endpoint #19). Both are provided for REST convention compatibility. Use whichever fits your API design preference.

---

#### 13. Get Operators with Status Filter (NEW)

**Endpoint:** `GET /api/admin/operators?status={ACTIVE|INACTIVE|ALL}`

**Full URL:** `http://localhost:8080/api/admin/operators?status=INACTIVE`

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Query Parameters:**
- `status` (optional): ACTIVE, INACTIVE, or ALL (default: ALL)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Operators retrieved successfully",
  "data": [
    {
      "id": 5,
      "name": "MTNL",
      "code": "MTNL",
      "category": "PREPAID",
      "logoUrl": "https://example.com/mtnl-logo.png",
      "isActive": false,
      "planCount": 3
    }
  ],
  "timestamp": "2026-03-20T14:00:00"
}
```

---

#### 14. Activate Operator (NEW)

**Endpoint:** `PATCH /api/admin/operators/{id}/activate`

**Full URL:** `http://localhost:8080/api/admin/operators/5/activate`

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Operator activated successfully",
  "data": {
    "id": 5,
    "name": "MTNL",
    "code": "MTNL",
    "category": "PREPAID",
    "logoUrl": "https://example.com/mtnl-logo.png",
    "isActive": true,
    "planCount": 3
  },
  "timestamp": "2026-03-20T14:05:00"
}
```

**Behavior:**
- Sets operator `isActive = true`
- Restores plans that were deactivated by operator deactivation
- Plans manually deactivated remain inactive

---

#### 15. Deactivate Operator (NEW)

**Endpoint:** `PATCH /api/admin/operators/{id}/deactivate`

**Full URL:** `http://localhost:8080/api/admin/operators/5/deactivate`

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Operator deactivated successfully",
  "data": {
    "id": 5,
    "name": "MTNL",
    "code": "MTNL",
    "category": "PREPAID",
    "logoUrl": "https://example.com/mtnl-logo.png",
    "isActive": false,
    "planCount": 3
  },
  "timestamp": "2026-03-20T14:10:00"
}
```

**Behavior:**
- Sets operator `isActive = false`
- Cascades deactivation to all active plans
- Tracks which plans were deactivated by operator

---

#### 16. Get Operator Plans with Status Filter (NEW)

**Endpoint:** `GET /api/admin/operators/{operatorId}/plans?status={ACTIVE|INACTIVE|ALL}`

**Full URL:** `http://localhost:8080/api/admin/operators/1/plans?status=INACTIVE`

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Query Parameters:**
- `status` (optional): ACTIVE, INACTIVE, or ALL (default: ACTIVE)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Plans retrieved successfully",
  "data": [
    {
      "id": 10,
      "operatorId": 1,
      "operatorName": "Airtel",
      "planName": "Old Plan",
      "price": 199.00,
      "validityDays": 28,
      "dataLimit": "1GB/day",
      "callBenefit": "Unlimited",
      "smsBenefit": "100 SMS/day",
      "additionalBenefits": "None",
      "category": "DATA",
      "isActive": false
    }
  ],
  "timestamp": "2026-03-20T14:15:00"
}
```

---

#### 17. Search All Plans with Filters (NEW)

**Endpoint:** `GET /api/admin/operators/plans`

**Full URL:** 
```
http://localhost:8080/api/admin/operators/plans?operatorId=1&status=INACTIVE&category=DATA&page=0&size=10
```

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Query Parameters:**
- `operatorId` (optional): Filter by operator
- `status` (optional): ACTIVE, INACTIVE, or ALL (default: ALL)
- `category` (optional): Plan category
- `page` (optional, default: 0): Page number
- `size` (optional, default: 10): Page size
- `sortBy` (optional, default: price): Sort field
- `sortDir` (optional, default: ASC): ASC or DESC

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Plans retrieved successfully",
  "data": {
    "content": [
      {
        "id": 10,
        "operatorId": 1,
        "operatorName": "Airtel",
        "planName": "Old Data Plan",
        "price": 199.00,
        "validityDays": 28,
        "dataLimit": "1GB/day",
        "callBenefit": "Unlimited",
        "smsBenefit": "100 SMS/day",
        "additionalBenefits": "None",
        "category": "DATA",
        "isActive": false
      }
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 1,
    "totalPages": 1
  },
  "timestamp": "2026-03-20T14:20:00"
}
```

---

#### 18. Activate Plan (NEW)

**Endpoint:** `PATCH /api/admin/operators/plans/{planId}/activate`

**Full URL:** `http://localhost:8080/api/admin/operators/plans/10/activate`

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Plan activated successfully",
  "data": {
    "id": 10,
    "operatorId": 1,
    "operatorName": "Airtel",
    "planName": "Old Data Plan",
    "price": 199.00,
    "validityDays": 28,
    "dataLimit": "1GB/day",
    "callBenefit": "Unlimited",
    "smsBenefit": "100 SMS/day",
    "additionalBenefits": "None",
    "category": "DATA",
    "isActive": true
  },
  "timestamp": "2026-03-20T14:25:00"
}
```

**Note:** Can only activate if operator is active

---

#### 19. Deactivate Plan (NEW)

**Endpoint:** `PATCH /api/admin/operators/plans/{planId}/deactivate`

**Full URL:** `http://localhost:8080/api/admin/operators/plans/10/deactivate`

**Headers:**
```
Authorization: Bearer {admin_access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Plan deactivated successfully",
  "data": {
    "id": 10,
    "operatorId": 1,
    "operatorName": "Airtel",
    "planName": "Old Data Plan",
    "price": 199.00,
    "validityDays": 28,
    "dataLimit": "1GB/day",
    "callBenefit": "Unlimited",
    "smsBenefit": "100 SMS/day",
    "additionalBenefits": "None",
    "category": "DATA",
    "isActive": false
  },
  "timestamp": "2026-03-20T14:30:00"
}
```

**Note:** This endpoint does the SAME thing as DELETE (endpoint #12). Both set `isActive = false` and `deactivatedByOperator = false`. Use whichever fits your API design preference.

---

## Testing Flows

### Flow 1: User Recharge with Auto-Detection (Recommended)

**Scenario:** User enters mobile number, system auto-detects operator and shows plans

1. **User Enters Mobile Number** (No auth needed)
   ```
   GET http://localhost:8080/api/operators/detect?mobileNumber=9876543210
   ```
   Response includes operator details and available plans

2. **User Selects a Plan** (Requires login)
   ```
   POST http://localhost:8080/api/auth/login
   {
     "email": "user1@omnicharge.com",
     "password": "User@123"
   }
   ```

3. **View More Plans for Detected Operator**
   ```
   GET http://localhost:8080/api/plans/search?operatorId=1
   Authorization: Bearer {accessToken}
   ```

4. **Get Specific Plan Details** (No auth needed)
   ```
   GET http://localhost:8080/api/plans/1
   ```

5. **Proceed to Recharge** (Next: Payment Service)

---

### Flow 2: User Recharge with Manual Operator Selection

**Scenario:** Auto-detection fails or user wants to manually select operator

1. **Try Auto-Detection First** (Optional)
   ```
   GET http://localhost:8080/api/operators/detect?mobileNumber=9876543210
   ```
   If detection fails or returns wrong operator...

2. **Get All Active Operators** (No auth needed)
   ```
   GET http://localhost:8080/api/operators/active
   ```
   User sees list of all operators with logos

3. **User Selects Operator Manually**
   User clicks on "Airtel" (operatorId: 1)

4. **Get Operator Details** (Optional, for confirmation)
   ```
   GET http://localhost:8080/api/operators/1
   ```

5. **Login** (if not already logged in)
   ```
   POST http://localhost:8080/api/auth/login
   {
     "email": "user1@omnicharge.com",
     "password": "User@123"
   }
   ```

6. **Browse Plans for Selected Operator**
   ```
   GET http://localhost:8080/api/plans/search?operatorId=1
   Authorization: Bearer {accessToken}
   ```

7. **Filter by Category** (Optional)
   ```
   GET http://localhost:8080/api/plans/search?operatorId=1&category=DATA
   Authorization: Bearer {accessToken}
   ```

8. **Select Plan and Proceed to Recharge**

---

### Flow 3: User Browsing Plans

**Scenario:** Regular user wants to browse and select a recharge plan

1. **Login as User**
   ```
   POST http://localhost:8080/api/auth/login
   {
     "email": "user1@omnicharge.com",
     "password": "User@123"
   }
   ```
   Save `accessToken`

2. **Detect Operator** (Optional, no auth needed)
   ```
   GET http://localhost:8080/api/operators/detect?mobileNumber=9876543210
   ```

3. **Search Plans for Airtel**
   ```
   GET http://localhost:8080/api/plans/search?operatorId=1&page=0&size=10
   Authorization: Bearer {accessToken}
   ```

4. **Get Specific Plan Details** (No auth needed)
   ```
   GET http://localhost:8080/api/plans/1
   ```

5. **Filter by Category**
   ```
   GET http://localhost:8080/api/plans/search?operatorId=1&category=DATA
   Authorization: Bearer {accessToken}
   ```

6. **Filter by Price Range**
   ```
   GET http://localhost:8080/api/plans/search?operatorId=1&minPrice=200&maxPrice=500
   Authorization: Bearer {accessToken}
   ```

---

### Flow 4: Admin Managing Operators

**Scenario:** Admin wants to add a new operator and plans

1. **Login as Admin**
   ```
   POST http://localhost:8080/api/auth/login
   {
     "email": "admin@omnicharge.com",
     "password": "Admin@123"
   }
   ```
   Save `accessToken`

2. **View All Operators**
   ```
   GET http://localhost:8080/api/admin/operators
   Authorization: Bearer {accessToken}
   ```

3. **Create New Operator**
   ```
   POST http://localhost:8080/api/admin/operators
   Authorization: Bearer {accessToken}
   {
     "name": "MTNL",
     "code": "MTNL",
     "category": "PREPAID",
     "logoUrl": "https://example.com/mtnl.png"
   }
   ```
   Note the returned `id` (e.g., 5)

4. **Add Plans for New Operator**
   ```
   POST http://localhost:8080/api/admin/operators/5/plans
   Authorization: Bearer {accessToken}
   {
     "planName": "Basic Plan",
     "price": 199,
     "validityDays": 28,
     "dataLimit": "1GB/day",
     "callBenefit": "Unlimited",
     "smsBenefit": "100 SMS/day",
     "category": "DATA"
   }
   ```

5. **Update Operator**
   ```
   PUT http://localhost:8080/api/admin/operators/5
   Authorization: Bearer {accessToken}
   {
     "name": "MTNL Delhi",
     "code": "MTNL",
     "category": "PREPAID",
     "logoUrl": "https://example.com/mtnl-new.png"
   }
   ```

6. **Update Plan**
   ```
   PUT http://localhost:8080/api/admin/operators/plans/9
   Authorization: Bearer {accessToken}
   {
     "planName": "Basic Plan Updated",
     "price": 249,
     "validityDays": 28,
     "dataLimit": "1.5GB/day",
     "callBenefit": "Unlimited",
     "smsBenefit": "100 SMS/day",
     "category": "RECOMMENDED"
   }
   ```

---

### Flow 5: Admin Managing Existing Plans

**Scenario:** Admin wants to update Airtel plans

1. **Login as Admin**

2. **Get All Operators**
   ```
   GET http://localhost:8080/api/admin/operators
   ```
   Find Airtel ID (should be 1)

3. **Search Airtel Plans**
   ```
   GET http://localhost:8080/api/plans/search?operatorId=1
   Authorization: Bearer {accessToken}
   ```

4. **Update a Plan**
   ```
   PUT http://localhost:8080/api/admin/operators/plans/1
   Authorization: Bearer {accessToken}
   {
     "planName": "Unlimited 84 Days - Special Offer",
     "price": 699,
     "validityDays": 84,
     "dataLimit": "2GB/day",
     "callBenefit": "Unlimited",
     "smsBenefit": "100 SMS/day",
     "additionalBenefits": "Free Hellotunes + Wynk Music",
     "category": "RECOMMENDED"
   }
   ```

5. **Delete a Plan** (if needed)
   ```
   DELETE http://localhost:8080/api/admin/operators/plans/3
   Authorization: Bearer {accessToken}
   ```

---

### Flow 6: Admin Managing Operator and Plan Status (NEW)

**Scenario:** Admin needs to temporarily deactivate an operator and later reactivate it

1. **Login as Admin**
   ```
   POST http://localhost:8080/api/auth/login
   {
     "email": "admin@omnicharge.com",
     "password": "Admin@123"
   }
   ```

2. **View All Operators (Including Inactive)**
   ```
   GET http://localhost:8080/api/admin/operators?status=ALL
   Authorization: Bearer {accessToken}
   ```

3. **Deactivate Operator (e.g., Airtel for maintenance)**
   ```
   PATCH http://localhost:8080/api/admin/operators/1/deactivate
   Authorization: Bearer {accessToken}
   ```
   Result: Airtel and all its active plans are deactivated

4. **Verify Plans Were Deactivated**
   ```
   GET http://localhost:8080/api/admin/operators/1/plans?status=INACTIVE
   Authorization: Bearer {accessToken}
   ```

5. **Try to Access Plan as User (Should Fail)**
   ```
   GET http://localhost:8080/api/plans/1
   Authorization: Bearer {userAccessToken}
   ```
   Result: 404 Not Found (operator is inactive)

6. **Reactivate Operator**
   ```
   PATCH http://localhost:8080/api/admin/operators/1/activate
   Authorization: Bearer {accessToken}
   ```
   Result: Airtel and previously active plans are restored

7. **Verify Plans Were Restored**
   ```
   GET http://localhost:8080/api/admin/operators/1/plans?status=ACTIVE
   Authorization: Bearer {accessToken}
   ```

---

### Flow 7: Admin Managing Individual Plan Status (NEW)

**Scenario:** Admin wants to temporarily disable a specific plan

1. **Login as Admin**

2. **View All Plans for Operator**
   ```
   GET http://localhost:8080/api/admin/operators/1/plans?status=ALL
   Authorization: Bearer {accessToken}
   ```

3. **Deactivate Specific Plan**
   ```
   PATCH http://localhost:8080/api/admin/operators/plans/2/deactivate
   Authorization: Bearer {accessToken}
   ```

4. **Verify Plan is Inactive**
   ```
   GET http://localhost:8080/api/admin/operators/1/plans?status=INACTIVE
   Authorization: Bearer {accessToken}
   ```

5. **Later, Reactivate the Plan**
   ```
   PATCH http://localhost:8080/api/admin/operators/plans/2/activate
   Authorization: Bearer {accessToken}
   ```

---

### Flow 8: Complex Scenario - Operator with Mixed Plan States (NEW)

**Scenario:** Operator has 20 plans, 7 are manually deactivated, then operator is deactivated and reactivated

1. **Initial State**
   - Operator: Active
   - Plans: 20 total (13 active, 7 manually deactivated)

2. **Admin Deactivates Operator**
   ```
   PATCH http://localhost:8080/api/admin/operators/1/deactivate
   Authorization: Bearer {accessToken}
   ```
   Result:
   - Operator: Inactive
   - Plans: 20 total (0 active, 20 inactive)
   - 13 plans marked as "deactivated by operator"
   - 7 plans remain "manually deactivated"

3. **Admin Reactivates Operator**
   ```
   PATCH http://localhost:8080/api/admin/operators/1/activate
   Authorization: Bearer {accessToken}
   ```
   Result:
   - Operator: Active
   - Plans: 20 total (13 active, 7 inactive)
   - 13 plans restored to active (were deactivated by operator)
   - 7 plans remain inactive (were manually deactivated)

4. **Verify Correct State**
   ```
   GET http://localhost:8080/api/admin/operators/1/plans?status=ACTIVE
   Authorization: Bearer {accessToken}
   ```
   Should show 13 active plans

   ```
   GET http://localhost:8080/api/admin/operators/1/plans?status=INACTIVE
   Authorization: Bearer {accessToken}
   ```
   Should show 7 inactive plans

---

### Flow 9: Admin Viewing Inactive/Deleted Items (NEW)

**Scenario:** Admin wants to view all inactive operators and plans (trash/archive)

1. **Login as Admin**

2. **View Only Inactive Operators**
   ```
   GET http://localhost:8080/api/admin/operators?status=INACTIVE
   Authorization: Bearer {accessToken}
   ```

3. **View All Inactive Plans Across All Operators**
   ```
   GET http://localhost:8080/api/admin/operators/plans?status=INACTIVE&page=0&size=20
   Authorization: Bearer {accessToken}
   ```

4. **View Inactive Plans for Specific Operator**
   ```
   GET http://localhost:8080/api/admin/operators/1/plans?status=INACTIVE
   Authorization: Bearer {accessToken}
   ```

5. **Restore Specific Plan**
   ```
   PATCH http://localhost:8080/api/admin/operators/plans/10/activate
   Authorization: Bearer {accessToken}
   ```

---

---

## New Features & Improvements

### 1. Admin Status Filtering

Admins can now filter operators and plans by status:
- **ACTIVE**: Only active items
- **INACTIVE**: Only inactive/deleted items  
- **ALL**: All items regardless of status (default)

This allows admins to:
- View "trash" or archived items
- Manage inactive operators and plans
- Restore accidentally deleted items

### 2. Plan Activation/Deactivation

New dedicated endpoints for plan status management:
- `PATCH /api/admin/operators/plans/{id}/activate` - Restore deleted plan
- `PATCH /api/admin/operators/plans/{id}/deactivate` - Soft delete plan

Benefits:
- Clear intent (activate vs deactivate vs update)
- Allows restoration of deleted plans
- Prevents accidental status changes during updates

### 3. Cascading Status Management

When an operator is deactivated/reactivated, the system intelligently manages plan states:

**Deactivation:**
- Operator is set to inactive
- All active plans are deactivated
- System tracks which plans were deactivated by operator (vs manually)

**Reactivation:**
- Operator is set to active
- Plans deactivated by operator are restored to active
- Plans manually deactivated remain inactive

**Example Scenario:**
```
Initial: Operator has 20 plans (15 active, 5 manually inactive)
↓
Admin deactivates operator
↓
Result: Operator inactive, all 20 plans inactive (15 tracked as "deactivated by operator")
↓
Admin reactivates operator
↓
Result: Operator active, 15 plans restored to active, 5 remain inactive
```

### 4. User Access Protection

User-facing endpoints now check both plan AND operator status:
- `GET /api/plans/{id}` - Returns 404 if operator is inactive
- `GET /api/plans/search` - Only returns plans of active operators

This prevents users from accessing plans of inactive operators.

### 5. Database Changes

New field added to `plans` table:
- `deactivated_by_operator` (BOOLEAN) - Tracks if plan was deactivated due to operator deactivation

Run the migration script: `DATABASE_MIGRATION_SCRIPT.sql`

---

### 6. Understanding UPDATE vs DELETE vs DEACTIVATE

**Important Clarification:**

| Endpoint | Method | What It Changes | Use Case |
|----------|--------|-----------------|----------|
| **UPDATE Plan** | `PUT /api/admin/operators/plans/{id}` | Plan details (name, price, validity, benefits, category) | Modify plan information without changing status |
| **DELETE Plan** | `DELETE /api/admin/operators/plans/{id}` | `is_active = false`<br>`deactivated_by_operator = false` | Soft delete (REST convention) |
| **DEACTIVATE Plan** | `PATCH /api/admin/operators/plans/{id}/deactivate` | `is_active = false`<br>`deactivated_by_operator = false` | Soft delete (explicit intent) |
| **ACTIVATE Plan** | `PATCH /api/admin/operators/plans/{id}/activate` | `is_active = true`<br>`deactivated_by_operator = false` | Restore deleted plan |

**Key Points:**
- **UPDATE** is essential - it's the only way to change plan details without affecting status
- **DELETE** and **DEACTIVATE** do exactly the same thing - both are provided for API design flexibility
- Use **DELETE** if you prefer REST conventions (DELETE = remove)
- Use **DEACTIVATE/ACTIVATE** if you prefer explicit status management
- Both DELETE and DEACTIVATE can be reversed using ACTIVATE

**Example Workflow:**
```
1. Create plan → Plan is active
2. UPDATE plan → Change price from ₹399 to ₹449 (still active)
3. DELETE or DEACTIVATE → Plan becomes inactive
4. ACTIVATE → Plan becomes active again with updated price
```

---

## Error Responses

### 401 Unauthorized (No Token)
```json
{
  "status": 401,
  "message": "Unauthorized",
  "path": "/api/plans/1",
  "timestamp": "2026-03-19T22:00:00"
}
```

### 403 Forbidden (User trying admin endpoint)
```json
{
  "status": 403,
  "message": "Access denied",
  "path": "/api/admin/operators",
  "timestamp": "2026-03-19T22:00:00"
}
```

### 404 Not Found
```json
{
  "status": 404,
  "message": "Operator not found",
  "path": "/api/admin/operators/999",
  "timestamp": "2026-03-19T22:00:00"
}
```

### 400 Bad Request (Validation Error)
```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": {
    "price": "Price must be positive",
    "planName": "Plan name is required"
  },
  "path": "/api/admin/operators/1/plans",
  "timestamp": "2026-03-19T22:00:00"
}
```

### 409 Conflict (Duplicate)
```json
{
  "status": 409,
  "message": "Operator code already exists",
  "path": "/api/admin/operators",
  "timestamp": "2026-03-19T22:00:00"
}
```

---

## Database Verification

### Check Operators
```sql
USE omnicharge_operator_db;

SELECT id, name, code, category, is_active 
FROM operators 
ORDER BY id;
```

### Check Plans
```sql
SELECT p.id, o.name as operator, p.plan_name, p.price, p.validity_days, p.category
FROM plans p
JOIN operators o ON p.operator_id = o.id
ORDER BY o.id, p.price;
```

### Check Plans by Operator
```sql
SELECT plan_name, price, validity_days, data_limit, category
FROM plans
WHERE operator_id = 1
ORDER BY price;
```

---

## Postman Collection Setup

### Environment Variables
```
gateway_url: http://localhost:8080
access_token: (auto-set after login)
operator_id: 1
plan_id: 1
```

### Collection-Level Pre-request Script
```javascript
// Log request
console.log("=== REQUEST ===");
console.log("Method:", pm.request.method);
console.log("URL:", pm.request.url.toString());
```

### Collection-Level Test Script
```javascript
// Common tests
pm.test("Response time < 2000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

pm.test("Response has timestamp", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('timestamp');
});
```

---

## Testing Checklist

### User Endpoints
- [ ] Detect operator by mobile number
- [ ] Get plan by ID (no auth required - public endpoint)
- [ ] Search plans by operator (only active operators)
- [ ] Filter plans by category
- [ ] Filter plans by price range
- [ ] Pagination works correctly
- [ ] Sorting works (ASC/DESC)
- [ ] Cannot access plans of inactive operators (404)

### Admin Endpoints - Operators
- [ ] Get all operators (default: ALL)
- [ ] Filter operators by ACTIVE status
- [ ] Filter operators by INACTIVE status
- [ ] Create new operator
- [ ] Update operator
- [ ] Delete operator (soft delete)
- [ ] Activate operator
- [ ] Deactivate operator
- [ ] Validation errors handled
- [ ] Duplicate operator code rejected

### Admin Endpoints - Plans
- [ ] Get operator plans (default: ACTIVE)
- [ ] Filter plans by ACTIVE status
- [ ] Filter plans by INACTIVE status
- [ ] Search all plans with filters
- [ ] Create plan for operator
- [ ] Update plan
- [ ] Delete plan (soft delete)
- [ ] Activate plan
- [ ] Deactivate plan
- [ ] Cannot activate plan if operator is inactive

### Cascading Behavior
- [ ] Deactivating operator deactivates all active plans
- [ ] Reactivating operator restores plans deactivated by operator
- [ ] Manually deactivated plans remain inactive after operator reactivation
- [ ] Complex scenario: 20 plans (13 active, 7 inactive) → operator deactivate → operator activate → correct state restored

### Authorization
- [ ] User can access user endpoints
- [ ] User cannot access admin endpoints (403)
- [ ] Admin can access all endpoints
- [ ] Unauthenticated requests rejected (401)

---

## Configuration Notes

### Numverify API (Optional)
For operator detection to work, configure Numverify API key:

**Get API Key:** https://numverify.com/

**Configure:**
```properties
# application.properties or environment variable
numverify.api.key=YOUR_API_KEY_HERE
```

**Without API Key:** Operator detection will return error, but other endpoints work fine.

---

## Quick Reference

| Operation | Method | Endpoint | Auth | Role | Notes |
|-----------|--------|----------|------|------|-------|
| Detect Operator | GET | /api/operators/detect | No | - | Auto-detect via Numverify |
| Get Active Operators | GET | /api/operators/active | No | - | Manual selection |
| Get Operator by ID | GET | /api/operators/{id} | No | - | Public access |
| Get Plan by ID | GET | /api/plans/{id} | No | - | Public access (changed from authenticated) |
| Search Plans | GET | /api/plans/search | Yes | User/Admin | Only active plans of active operators |
| **Admin: Operators** |
| Get All Operators | GET | /api/admin/operators?status={ACTIVE\|INACTIVE\|ALL} | Yes | Admin | Filter by status |
| Create Operator | POST | /api/admin/operators | Yes | Admin | |
| Update Operator | PUT | /api/admin/operators/{id} | Yes | Admin | |
| Delete Operator | DELETE | /api/admin/operators/{id} | Yes | Admin | Soft delete + cascade to plans |
| Activate Operator | PATCH | /api/admin/operators/{id}/activate | Yes | Admin | Restore operator + plans |
| Deactivate Operator | PATCH | /api/admin/operators/{id}/deactivate | Yes | Admin | Deactivate + cascade to plans |
| **Admin: Plans** |
| Get Operator Plans | GET | /api/admin/operators/{id}/plans?status={ACTIVE\|INACTIVE\|ALL} | Yes | Admin | Filter by status |
| Search All Plans | GET | /api/admin/operators/plans?operatorId={id}&status={ACTIVE\|INACTIVE\|ALL}&category={cat} | Yes | Admin | Cross-operator search |
| Create Plan | POST | /api/admin/operators/{operatorId}/plans | Yes | Admin | |
| Update Plan | PUT | /api/admin/operators/plans/{planId} | Yes | Admin | |
| Delete Plan | DELETE | /api/admin/operators/plans/{planId} | Yes | Admin | Soft delete |
| Activate Plan | PATCH | /api/admin/operators/plans/{planId}/activate | Yes | Admin | Restore deleted plan |
| Deactivate Plan | PATCH | /api/admin/operators/plans/{planId}/deactivate | Yes | Admin | Soft delete |

---

## Troubleshooting

### Issue: 401 Unauthorized
- Ensure you're using gateway URL (port 8080)
- Check access token is valid and not expired
- Login again to get fresh token

### Issue: 403 Forbidden
- Verify you're using admin account for admin endpoints
- Check token has ROLE_ADMIN

### Issue: Operator detection not working
- Configure Numverify API key
- Check internet connectivity
- Verify API key is valid

### Issue: Plans not showing
- Check operator-service is running
- Verify database has seeded data
- Check operator ID exists

---

**All endpoints tested and working!** ✅

**Service:** Operator Service  
**Port:** 8082  
**Gateway:** http://localhost:8080  
**Database:** omnicharge_operator_db


---


# Operator Service API

## Endpoints

### OperatorDetectionController (Public Lookup)
* `GET /api/operators/detect` - Takes a mobile number and detects the operator structure via Regex / 3rd-party Numverify API.
* `GET /api/operators/active` - List all currently active operators.
* `GET /api/operators/{id}` - Specific operator metadata.

### PlanController (Public Lookup)
* `GET /api/plans/{id}` - Fetch single plan details.
* `GET /api/plans/search` - Search/filter plans (by price, data, operator).

### AdminOperatorController (CMS)
* `GET /api/admin/operators` - List operators (CMS view).
* `POST /api/admin/operators` - Add new operator.
* `PUT /api/admin/operators/{id}` - Update operator metadata.
* `DELETE /api/admin/operators/{id}` - Delete operator.
* `PATCH /api/admin/operators/{id}/activate` - Enable operator.
* `PATCH /api/admin/operators/{id}/deactivate` - Disable operator.
* `GET /api/admin/operators/{operatorId}/plans` - List plans for an operator.
* `POST /api/admin/operators/{operatorId}/plans` - Add plan.
* `PUT /api/admin/operators/plans/{planId}` - Update plan details.
* `DELETE /api/admin/operators/plans/{planId}` - Delete plan.
* `PATCH /api/admin/operators/plans/{planId}/activate` - Enable plan.
* `PATCH /api/admin/operators/plans/{planId}/deactivate` - Disable plan.

### AdminSystemController (System Administration)
* `POST /api/admin/system/rebuild-cache` - Empties and rebuilds Redis cache for plans.

## Request Flow
1. **End-to-End Search**: Client $\rightarrow$ API Gateway $\rightarrow$ PlanController $\rightarrow$ Checks Redis Cache `planCache` $\rightarrow$ Returns if hit. If miss $\rightarrow$ queries MySQL DB $\rightarrow$ Sets in Redis $\rightarrow$ Returns to client.
2. **Number Detection**: Client sends number to `/detect` $\rightarrow$ Checks local regex rules $\rightarrow$ Fallback to synchronous HTTP call to `numverify.com` external API via `RestTemplate`.

## Cache Usage (Redis)
* **High Availability Cache**: Extremely heavy usage given telecom plans are mostly static. `@Cacheable` is utilized along with programmatic cache eviction using `RedisTemplate`. 
* **Cache Rebuilding**: Operators and Plans are synced to Redis via `RedisProjector`. 

## RabbitMQ Communication
* **Producers**: When an admin updates an operator/plan in the CMS (`AdminOperatorController`), `OperatorEventPublisher` uses `RabbitTemplate` to push out `operator.events` and `plan.events`.
* **Consumers**: The `RedisProjector` is a `@RabbitListener` on `plan.update.queue`. When a plan is updated, it catches the event and asynchronously projection-maps it back to update the Redis cache so all nodes see the refreshed data instantly without DB querying.

## Sync vs Async Calls
* **Synchronous**: Standard CRUD lookups, Admin API insertions, External API calls to Nuverify (via RestTemplate).
* **Asynchronous**: Cache invalidation broadcasting across the cluster via RabbitMQ events so that other services (like Recharge Service) know plans have shifted.

