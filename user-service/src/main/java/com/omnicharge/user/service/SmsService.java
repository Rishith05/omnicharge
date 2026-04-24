package com.omnicharge.user.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * SMS service that prints OTP to the console.
 */
@Service
@Slf4j
public class SmsService implements ISmsService {

    private final RedisTemplate<String, String> redisTemplate;

    public SmsService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void sendOtp(String mobileNumber, String otp) {
        // Always log to console for debugging/dev visibility
        log.info("╔══════════════════════════════════════╗");
        log.info("║  SMS OTP for +91 {}           ║", mobileNumber);
        log.info("║  OTP: {}                          ║", otp);
        log.info("║  Valid for 5 minutes                 ║");
        log.info("╚══════════════════════════════════════╝");

        // Store OTP in dev display key (for dev convenience, also expires)
        String devOtpKey = "dev_otp_display:" + mobileNumber;
        redisTemplate.opsForValue().set(devOtpKey, otp, 5, TimeUnit.MINUTES);
    }
}
