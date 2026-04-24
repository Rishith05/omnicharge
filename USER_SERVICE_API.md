# User Service API

## Endpoints

### AuthController (Public & Core Auth)
* `POST /api/auth/register` - Create a new user.
* `POST /api/auth/login` - Authenticate using email and password, returning JWT token.
* `POST /api/auth/google` - OAuth2 Google sign-in.
* `POST /api/auth/refresh-token` - Refresh expired JWT tokens.
* `POST /api/auth/logout` - Invalidate the current token cache.
* `POST /api/auth/forgot-password` - Trigger OTP to email.
* `POST /api/auth/verify-otp` - Validate user's OTP.
* `POST /api/auth/reset-password` - Reset to new password.

### UserController (User Self-Service)
* `GET /api/users/profile` - Retrieve current user profile.
* `PUT /api/users/profile` - Update user details.
* `PUT /api/users/change-password` - Change account password.

### InternalUserController (Service-to-Service)
* `GET /api/users/{id}` - Fetch user by ID for inter-service communication (e.g., used by recharge-service).
* `GET /api/users/internal/{id}` - Strictly internal lookup without auth filters. 

### AdminUserController (Admin Management)
* `GET /api/admin/users` - Paginated user list.
* `GET /api/admin/users/{id}` - Fetch specific user details.
* `PUT /api/admin/users/{id}/status` - Activate/deactivate user.

## Request Flow
1. **End-to-End**: Client makes an auth request $\rightarrow$ API Gateway validates if auth is needed $\rightarrow$ Routes to User-Service $\rightarrow$ User-Service validates credentials via DB $\rightarrow$ Issues JWT $\rightarrow$ Client uses JWT as Bearer token for future requests.
2. Interservice dependencies call `/api/users/internal/{id}` to enrich entity data (like injecting user emails into sagas).

## Cache Usage (Redis)
* **JWT Blacklisting**: Redis is used to store blacklisted/invalidated JWTs upon logout (`RedisTemplate<String, String>`).
* **OTP Caching**: Forgotten password OTP sequences are temporarily cached in Redis with a short TTL. 

## RabbitMQ Communication
* **None**: The User Service operates primarily synchronously and does not hook into the global event bus. Interaction with other services happens directly via REST.

## Sync vs Async Calls
* **Synchronous**: All DB queries, JWT generation, OTP validation, and API Gateway communications are synchronous. 
* **Asynchronous**: Email delivery for forgot-password OTP runs in an async detached process to not block the main API response.
