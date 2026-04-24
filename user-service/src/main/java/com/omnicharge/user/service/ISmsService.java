package com.omnicharge.user.service;

public interface ISmsService {
    
    /**
     * Send OTP SMS to the given mobile number.
     * Implementations can use Twilio, AWS SNS, or console logging for dev.
     */
    void sendOtp(String mobileNumber, String otp);
}
