package com.omnicharge.gateway.config;

import org.springframework.context.annotation.Configuration;

/**
 * Gateway configuration.
 * 
 * Routes are defined in api-gateway.properties (via Config Server).
 * Rate limiting via Redis is disabled for local development because
 * the Windows-native Redis 3.0.x does not support the Lua scripts
 * required by Spring Cloud Gateway's RedisRateLimiter.
 * 
 * To re-enable rate limiting in production (with Redis 3.2+),
 * uncomment the RedisRateLimiter and RouteLocator beans.
 */
@Configuration
public class GatewayConfig {
    // Routes are configured via properties in config-server
    // (config/api-gateway.properties)
}

