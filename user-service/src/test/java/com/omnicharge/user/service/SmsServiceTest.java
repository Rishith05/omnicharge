package com.omnicharge.user.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import java.util.concurrent.TimeUnit;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SmsServiceTest {

    private SmsService smsService;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        smsService = new SmsService(redisTemplate);
    }

    @Test
    void sendOtp_ShouldLogAndStoreInRedis() {
        String mobile = "9876543210";
        String otp = "123456";

        smsService.sendOtp(mobile, otp);

        verify(valueOperations).set(eq("dev_otp_display:" + mobile), eq(otp), eq(5L), eq(TimeUnit.MINUTES));
    }
}
