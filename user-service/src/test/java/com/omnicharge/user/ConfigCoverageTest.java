package com.omnicharge.user;

import com.omnicharge.user.config.SecurityConfig;
import com.omnicharge.user.filter.GatewayAuthenticationFilter;
import com.omnicharge.user.service.SmsService;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ConfigCoverageTest {

    // ═══════════════════════════════════════════════════════════
    // Application Main
    // ═══════════════════════════════════════════════════════════

    @Test
    void applicationCanBeInstantiated() {
        UserServiceApplication app = new UserServiceApplication();
        assertNotNull(app);
    }

    // ═══════════════════════════════════════════════════════════
    // SecurityConfig - beans
    // ═══════════════════════════════════════════════════════════

    @Test
    void securityConfig_canBeInstantiated() {
        GatewayAuthenticationFilter filter = new GatewayAuthenticationFilter();
        SecurityConfig config = new SecurityConfig(filter);
        assertNotNull(config);
    }

    @Test
    void securityConfig_passwordEncoder() {
        GatewayAuthenticationFilter filter = new GatewayAuthenticationFilter();
        SecurityConfig config = new SecurityConfig(filter);
        PasswordEncoder encoder = config.passwordEncoder();
        assertNotNull(encoder);
        // Verify it can encode and match
        String encoded = encoder.encode("test123");
        assertTrue(encoder.matches("test123", encoded));
        assertFalse(encoder.matches("wrong", encoded));
    }

    // ═══════════════════════════════════════════════════════════
    // SmsService - all branches
    // ═══════════════════════════════════════════════════════════

    @Test
    @SuppressWarnings("unchecked")
    void smsService_sendOtp_withoutTwilio() {
        RedisTemplate<String, String> redisTemplate = mock(RedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        SmsService smsService = new SmsService(redisTemplate);
        // Default @Value won't be set in unit tests, so accountSid will be null
        smsService.sendOtp("9876543210", "123456");
        // Should store in Redis dev display
        verify(valueOps).set(eq("dev_otp_display:9876543210"), eq("123456"), anyLong(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void smsService_init_withoutCredentials() {
        RedisTemplate<String, String> redisTemplate = mock(RedisTemplate.class);
        SmsService smsService = new SmsService(redisTemplate);
        // init() should not throw even without Twilio credentials
        smsService.init();
    }
}
