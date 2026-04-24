# API Gateway API

## Endpoints

### Routing Configuration (GatewayConfig YAML & Code)
* `lb://user-service` $\rightarrow$ `/api/users/**`, `/api/auth/**`
* `lb://operator-service` $\rightarrow$ `/api/operators/**`, `/api/plans/**`, `/api/admin/operators/**`
* `lb://recharge-service` $\rightarrow$ `/api/recharges/**`, `/api/admin/recharges/**`
* `lb://payment-service` $\rightarrow$ `/api/payments/**`, `/api/admin/payments/**`
* `lb://notification-service` $\rightarrow$ `/api/notifications/**`, `/api/admin/notifications/**`

## Request Flow
1. **Entry Point Execution**: The frontend hits the gateway on a single unified port before accessing any internal microservice IPs. 
2. **Spring Cloud Gateway Rate Limiter**: Configured with an average replenishment of 2 requests per second and burst of 3. Limits rate by filtering `X-User-Id` or IP addresses to bounce DoS attempts globally.
3. **Jwt Authentication Filter Validation**: Every URI sequence matches against `isPublicPath()` mappings.
4. If it is an insecure endpoint (e.g., `/api/auth/login`, `/api/operators/detect`), the filter skips token decoding and forwards immediately.
5. If secure, the gateway verifies the token's JVM hash signature and determines profile completions. It blocks paths if profile completion is mandatory and unset. 
6. Using a fast-access `ReactiveRedisTemplate()`, the Gateway ensures the unique `jti` is not flagged globally as an invalid logged-out key constraint.
7. Finally, it unpacks the valid JWT properties injecting `X-User-Id`, `X-User-Role`, `X-User-Email` HTTP headers forwarding it seamlessly downstream without storing states globally.

## Cache Usage (Redis)
* **JWT Blacklist Engine**: Validates every token `jti` claim against the fast-access in-memory store in Redis if the token previously touched a secure backend logout route. Any `blacklist:*` constraint throws an immediate `UNAUTHORIZED` stop execution.
* **Rate Limiting Engine**: `RedisRateLimiter(2, 3, 1)` uses Redis token bucket configuration rules to block global IP spikes across the boundary limits inherently bypassing database checks. 

## RabbitMQ Communication
* **None**: Strictly acts as the stateless REST HTTP reverse-proxy layer enforcing horizontal load balancing requests over to Eureka clients via standard networking payload distributions.

## Sync vs Async Calls
* **Non-Blocking Reactor**: All request transformations natively sit on top of the Spring WebFlux architecture routing mappings. `Mono.just(userId)` chains are un-blocked when cross-referencing to Redis preventing gateway connection pooling starvation issues under high concurrency load environments.

