package com.omnicharge.user.service;

import com.omnicharge.user.dto.*;

public interface IAuthService {
    
    /** Send OTP to phone number for login/registration */
    void sendOtp(SendOtpRequest request);
    
    /** Verify OTP and authenticate (auto-creates user if new phone number) */
    AuthResponse verifyOtp(VerifyPhoneOtpRequest request);
    
    /** Google OAuth authentication */
    AuthResponse authenticateWithGoogle(GoogleAuthRequest request);
    
    /** Refresh access token using refresh token JWT from frontend localStorage */
    AuthResponse refreshToken(RefreshTokenRequest request);
    
    /** Logout — blacklist current access token */
    void logout(String token);
}
