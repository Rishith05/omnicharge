package com.omnicharge.user.controller;

import com.omnicharge.common.dto.ApiResponse;
import com.omnicharge.user.dto.*;
import com.omnicharge.user.service.IAuthService;
import com.omnicharge.user.service.IPasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final IAuthService authService;
    private final IPasswordResetService passwordResetService;
    private final RedisTemplate<String, String> redisTemplate;

    // ═══════════════════════════════════════════════════════════
    // Phone OTP Authentication (primary login method)
    // ═══════════════════════════════════════════════════════════

    /**
     * Step 1: Send a 6-digit OTP to the given phone number.
     * Rate limited to 1 OTP per minute and 5 per hour per phone number.
     */
    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<Void>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        log.info("OTP send request for +91{}", request.getMobileNumber());
        authService.sendOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP sent to your phone number. Valid for 5 minutes.", null));
    }

    /**
     * Step 2: Verify the OTP and authenticate.
     * On success, returns JWT tokens (access + refresh).
     * Admin role is automatically assigned/enforced based on phone number.
     */
    @PostMapping("/verify-phone-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyPhoneOtp(
            @Valid @RequestBody VerifyPhoneOtpRequest request) {
        log.info("OTP verify request for +91{}", request.getMobileNumber());
        AuthResponse response = authService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Phone verified successfully", response));
    }

    // ═══════════════════════════════════════════════════════════
    // Google OAuth (retained)
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> authenticateWithGoogle(
            @Valid @RequestBody GoogleAuthRequest request) {
        AuthResponse response = authService.authenticateWithGoogle(request);
        return ResponseEntity.ok(ApiResponse.success("Google authentication successful", response));
    }

    // ═══════════════════════════════════════════════════════════
    // Token Management
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        authService.logout(token);
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    // ═══════════════════════════════════════════════════════════
    // Password Reset (for legacy LOCAL users — kept for backward compat)
    // ═══════════════════════════════════════════════════════════

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("OTP sent to your email", null));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Boolean>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {
        boolean isValid = passwordResetService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP verified successfully", isValid));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully", null));
    }

    // ═══════════════════════════════════════════════════════════
    // Development-only: Retrieve OTP for display (no real SMS in dev)
    // ⚠️ This endpoint should be DISABLED in production
    // ═══════════════════════════════════════════════════════════

    @GetMapping("/dev-otp/{mobileNumber}")
    public ResponseEntity<ApiResponse<String>> getDevOtp(@PathVariable String mobileNumber) {
        String devOtpKey = "dev_otp_display:" + mobileNumber;
        String otp = redisTemplate.opsForValue().get(devOtpKey);
        if (otp == null) {
            return ResponseEntity.ok(ApiResponse.success("No OTP found or expired", null));
        }
        return ResponseEntity.ok(ApiResponse.success("Dev OTP retrieved", otp));
    }
}
