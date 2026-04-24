# 🔐 API Gateway - Test Coverage Report

## 1. Overview
The **API Gateway** is the central security gatekeeper for all OmniCharge microservices. It validates JWTs, enforces profile completion (Google OAuth flow), checks Redis blacklists (logout), propagates user headers downstream, applies Redis-based rate limiting, and provides comprehensive centralized logging for all HTTP requests and routing decisions.

## 2. Component Coverage
| Component | Test Class | Tests | Coverage |
| :--- | :--- | :---: | :--- |
| **JWT Auth Filter** | `JwtAuthenticationFilterTest` | 29 | Public path bypasses (11 paths), missing/malformed/expired/wrong-secret JWT, profile completion enforcement, Redis blacklist, fail-open, header propagation, authentication logging |
| **WebFlux Log Capture Filter** | `WebFluxLogCaptureFilterTest` | 21 | Request/response capture, trace ID extraction, routing decision logging, source IP extraction (X-Forwarded-For), user context extraction, log level determination, actuator/swagger endpoint skipping, error handling with stack traces, response time measurement |
| **Rate Limit Config** | `RateLimitConfigTest` | 4 | UserId-based key resolution, empty header IP fallback, null header fallback |
| **Gateway Config** | `GatewayConfigTest` | 1 | RedisRateLimiter bean creation |

## 3. Key Edge Cases Tested
- **11 Public Paths** → All bypass filter: `/api/auth/*`, `/api/operators/*`, `/api/plans/*`, `/actuator`
- **Google OAuth incomplete profile** → `isProfileComplete=false` blocks all paths except `/api/users/profile` (403)
- **Blacklisted JWT (logout)** → Redis `hasKey("blacklist:<jti>")` = true → 401
- **Redis failure** → Fail-open design: request proceeds with headers injected
- **Expired JWT** → ExpiredJwtException → 401
- **Wrong signing key** → SignatureException → 401
- **Empty Bearer token** → IllegalArgumentException → 401
- **Null claim fields** → Gracefully handled without crashing filter
- **Filter ordering** → JwtAuthenticationFilter `getOrder() == -1`, WebFluxLogCaptureFilter `getOrder() == 0`

## 4. Centralized Logging Integration (Task 10)

### 4.1. WebFlux Logging Features
The API Gateway now provides comprehensive logging for all HTTP requests in the reactive WebFlux environment:

**HTTP Request Logging:**
- HTTP method, path, source IP (with X-Forwarded-For support)
- Response status code and response time (ms)
- User context (userId, userRole) when authenticated
- Target service and routing decision
- Trace ID extraction from headers (X-B3-TraceId, traceid)
- Log level determination: INFO (2xx), WARN (4xx), ERROR (5xx)

**Routing Decision Logging:**
- Separate DEBUG-level logs for routing decisions
- Target service and URI information
- Helps trace request flow through the gateway

**Authentication Logging:**
- WARN-level logs for authentication failures with sanitized token details
- DEBUG-level logs for successful authentication (audit trail)
- Email masking for privacy (e.g., u***@example.com)
- Never logs actual token values or signatures

**Smart Filtering:**
- Skips logging for actuator, swagger, api-docs, and webjars endpoints
- Prevents noise in centralized logs
- Focuses on business-critical API traffic

### 4.2. Test Coverage for Logging
**WebFluxLogCaptureFilterTest** validates:
- ✅ Request/response capture with correct log levels (INFO/WARN/ERROR)
- ✅ User context extraction (X-User-Id, X-User-Role headers)
- ✅ Source IP extraction (X-Forwarded-For with fallback to remote address)
- ✅ Trace ID extraction (X-B3-TraceId and alternative headers)
- ✅ Routing decision logging (separate DEBUG events)
- ✅ Actuator/swagger endpoint skipping (no logs generated)
- ✅ Error handling with stack trace capture
- ✅ Response time measurement
- ✅ Multiple HTTP methods (GET, POST, PUT, DELETE)
- ✅ Graceful handling when route attribute is missing

### 4.3. Log Event Structure
All logs published to centralized logging system include:
- **serviceName**: "api-gateway"
- **level**: INFO/WARN/ERROR/DEBUG
- **eventType**: HTTP, ROUTING, AUTHENTICATION
- **message**: Formatted log message with key details
- **traceId**: Propagated from request headers
- **timestamp**: LocalDateTime of event
- **context**: Map with structured data (method, path, statusCode, duration, sourceIp, targetService, userId, userRole)
- **stackTrace**: Included for ERROR-level events

### 4.4. Integration with omnicharge-common
- Uses `LogEventPublisher` from omnicharge-common for consistent logging
- Automatic fallback to local file when RabbitMQ is unavailable
- Publishes to `omnicharge.logging.exchange` with routing key `log.api-gateway`
- Consumed by logging-service for persistence and file writing

## 5. Cross-Service Validation
- JWT claim structure confirmed matching between `JwtUtil.generateAccessToken()` (User-Service) and `JwtAuthenticationFilter` (Gateway): `userId`, `email`, `role`, `jti`, `isProfileComplete`
- Header propagation: `X-User-Id`, `X-User-Role`, `X-User-Email` verified
- Logging infrastructure: LogEvent structure matches logging-service expectations

## 6. Maven Execution Result
- **Tests Run:** 55 (29 JWT + 21 WebFlux Logging + 4 Rate Limit + 1 Gateway Config)
- **Failures:** 0
- **Errors:** 0
- **Skipped:** 0
- **Build Time:** 16.096s
- **Result:** ✅ BUILD SUCCESS

## 7. Verification Tools
Located in `api-gateway/` directory (to be created):
- `verify-api-gateway-logging.ps1` - Automated verification script
- `test-api-gateway-complete-flow.ps1` - Complete flow test triggering all logging scenarios
- `verify-api-gateway-db-logs.sql` - Database verification queries

## 8. Key Improvements from Task 10
1. **Comprehensive HTTP Logging**: All requests logged with rich context
2. **Reactive WebFlux Support**: Proper logging in non-blocking reactive environment
3. **Smart Filtering**: Actuator/swagger endpoints excluded to reduce noise
4. **Authentication Audit Trail**: Both success and failure authentication events logged
5. **Routing Transparency**: Separate logs for routing decisions aid debugging
6. **Privacy Protection**: Email masking and token sanitization
7. **Error Visibility**: Stack traces captured for 5xx errors
8. **Performance Metrics**: Response time measured for all requests
