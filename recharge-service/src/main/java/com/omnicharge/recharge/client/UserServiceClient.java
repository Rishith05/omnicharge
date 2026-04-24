package com.omnicharge.recharge.client;

import com.omnicharge.common.dto.ApiResponse;
import com.omnicharge.recharge.dto.UserProfileResponse;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service")
public interface UserServiceClient {

    /**
     * Get user details by ID with circuit breaker and retry
     * 
     * @CircuitBreaker: Prevents cascading failures if User Service is down
     * @Retry: Retries failed calls with exponential backoff (max 3 attempts)
     * 
     * Used for fetching user email/mobile for expiring recharge notifications
     * 
     * Fallback: Returns null if service is unavailable after retries
     */
    @GetMapping("/api/users/internal/{id}")
    @CircuitBreaker(name = "userService")
    @Retry(name = "userService")
    ApiResponse<UserProfileResponse> getUserById(@PathVariable("id") Long id);
    

}
