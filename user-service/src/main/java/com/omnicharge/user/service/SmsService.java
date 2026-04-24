package com.omnicharge.user.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.concurrent.TimeUnit;

/**
 * SMS service that sends OTPs using Twilio.
 */
@Service
@Slf4j
public class SmsService implements ISmsService {

    private final RedisTemplate<String, String> redisTemplate;

    @Value("${TWILIO_ACCOUNT_SID:AC_NONE}")
    private String accountSid;

    @Value("${TWILIO_AUTH_TOKEN:NONE}")
    private String authToken;

    @Value("${TWILIO_PHONE_NUMBER:+10000000000}")
    private String fromPhoneNumber;

    public SmsService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @PostConstruct
    public void init() {
        if (accountSid != null && !accountSid.equals("AC_NONE")) {
            try {
                Twilio.init(accountSid, authToken);
                log.info("Twilio initialized for SMS service with Account SID: {}", accountSid);
            } catch (Exception e) {
                log.error("Failed to initialize Twilio: {}", e.getMessage());
            }
        } else {
            log.warn("Twilio credentials NOT found. SMS will be console-only.");
        }
    }

    @Override
    public void sendOtp(String mobileNumber, String otp) {
        // Always log to console for debugging/dev visibility
        log.info("╔══════════════════════════════════════╗");
        log.info("║  SMS OTP for +91 {}           ║", mobileNumber);
        log.info("║  OTP: {}                          ║", otp);
        log.info("║  Valid for 5 minutes                 ║");
        log.info("╚══════════════════════════════════════╝");

        // 1. Send via Twilio if configured
        if (accountSid != null && !accountSid.equals("AC_NONE")) {
            try {
                String targetNumber = mobileNumber.startsWith("+") ? mobileNumber : "+91" + mobileNumber;
                Message message = Message.creator(
                    new PhoneNumber(targetNumber),
                    new PhoneNumber(fromPhoneNumber),
                    "Your OmniCharge OTP is: " + otp + ". Valid for 5 minutes."
                ).create();
                log.info("Twilio SMS sent to {}. SID: {}", mobileNumber, message.getSid());
            } catch (Exception e) {
                log.error("Twilio SMS failed for {}: {}", mobileNumber, e.getMessage());
            }
        }

        // 2. Store OTP in dev display key
        String devOtpKey = "dev_otp_display:" + mobileNumber;
        redisTemplate.opsForValue().set(devOtpKey, otp, 5, TimeUnit.MINUTES);
    }
}
