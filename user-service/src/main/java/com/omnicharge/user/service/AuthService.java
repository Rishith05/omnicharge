package com.omnicharge.user.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.omnicharge.common.exception.BadRequestException;
import com.omnicharge.common.exception.DuplicateResourceException;
import com.omnicharge.common.exception.UnauthorizedException;
import com.omnicharge.common.logging.LogEvent;
import com.omnicharge.common.logging.LogEventPublisher;
import com.omnicharge.user.dto.*;
import com.omnicharge.user.entity.AuthProvider;
import com.omnicharge.user.entity.Role;
import com.omnicharge.user.entity.User;
import com.omnicharge.user.repository.UserRepository;
import com.omnicharge.user.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService implements IAuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final RedisTemplate<String, String> redisTemplate;
    private final LogEventPublisher logEventPublisher;
    private final ISmsService smsService;

    // ═══════════════════════════════════════════════════════════
    // Admin Configuration
    // ═══════════════════════════════════════════════════════════
    @Value("${admin.mobile-number:8688179553}")
    private String adminMobileNumber;

    // OTP settings
    private static final long OTP_EXPIRY_MINUTES = 5;       // OTP valid for 5 minutes
    private static final int MAX_OTP_ATTEMPTS = 5;           // Max verification attempts
    private static final long RATE_LIMIT_MINUTES = 1;        // Min wait between OTP requests
    private static final int MAX_SEND_ATTEMPTS_PER_HOUR = 5; // Brute-force protection: max sends/hour

    // ═══════════════════════════════════════════════════════════
    // Phone OTP Authentication
    // ═══════════════════════════════════════════════════════════

    @Override
    public void sendOtp(SendOtpRequest request) {
        String mobile = request.getMobileNumber();

        // Rate limiting: max 1 OTP per phone per minute (prevents spam)
        String rateLimitKey = "otp_rate:" + mobile;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(rateLimitKey))) {
            log.warn("OTP rate limit hit for +91{}", mobile);
            throw new BadRequestException("Please wait before requesting another OTP");
        }

        // Hourly brute-force protection: max N OTP sends per hour
        String hourlySendKey = "otp_hourly:" + mobile;
        String hourlyCount = redisTemplate.opsForValue().get(hourlySendKey);
        int sendCount = hourlyCount != null ? Integer.parseInt(hourlyCount) : 0;
        if (sendCount >= MAX_SEND_ATTEMPTS_PER_HOUR) {
            log.warn("OTP hourly limit exceeded for +91{} ({} attempts)", mobile, sendCount);
            throw new BadRequestException("Too many OTP requests. Please try again after some time.");
        }

        // Generate secure 6-digit OTP
        String otp = generateSecureOtp();

        // Hash OTP before storing (do NOT store plain OTP)
        String hashedOtp = passwordEncoder.encode(otp);

        // Store hashed OTP in Redis with 5-minute expiry
        String otpKey = "phone_otp:" + mobile;
        redisTemplate.opsForValue().set(otpKey, hashedOtp, OTP_EXPIRY_MINUTES, TimeUnit.MINUTES);

        // Reset attempt counter
        String attemptKey = "otp_attempts:" + mobile;
        redisTemplate.opsForValue().set(attemptKey, "0", OTP_EXPIRY_MINUTES, TimeUnit.MINUTES);

        // Set rate limit (1 minute cooldown)
        redisTemplate.opsForValue().set(rateLimitKey, "1", RATE_LIMIT_MINUTES, TimeUnit.MINUTES);

        // Increment hourly send counter (auto-expires after 1 hour)
        redisTemplate.opsForValue().set(hourlySendKey, String.valueOf(sendCount + 1), 1, TimeUnit.HOURS);

        // Send OTP
        smsService.sendOtp(mobile, otp);
        log.info("OTP sent to mobile: +91{}", mobile);

        // Log business event
        Map<String, Object> context = new HashMap<>();
        context.put("mobileNumber", mobile);
        context.put("otpExpiry", OTP_EXPIRY_MINUTES + " minutes");
        context.put("sendAttempt", sendCount + 1);
        publishBusinessLog("OTP_SENT", "OTP sent to +91" + mobile, context);
    }

    @Override
    @Transactional
    public AuthResponse verifyOtp(VerifyPhoneOtpRequest request) {
        String mobile = request.getMobileNumber();
        String otpKey = "phone_otp:" + mobile;
        String attemptKey = "otp_attempts:" + mobile;

        // Check attempt count (brute-force protection)
        String attempts = redisTemplate.opsForValue().get(attemptKey);
        int attemptCount = attempts != null ? Integer.parseInt(attempts) : 0;
        if (attemptCount >= MAX_OTP_ATTEMPTS) {
            // Delete OTP to force re-request
            redisTemplate.delete(otpKey);
            redisTemplate.delete(attemptKey);
            log.warn("Max OTP attempts exceeded for +91{}", mobile);

            Map<String, Object> ctx = new HashMap<>();
            ctx.put("mobileNumber", mobile);
            ctx.put("attempts", attemptCount);
            publishBusinessLog("OTP_MAX_ATTEMPTS_EXCEEDED",
                    "Max OTP attempts exceeded for +91" + mobile, ctx);

            throw new BadRequestException("Maximum OTP attempts exceeded. Please request a new OTP.");
        }

        // Get stored hashed OTP
        String storedHashedOtp = redisTemplate.opsForValue().get(otpKey);
        if (storedHashedOtp == null) {
            log.warn("OTP expired or not found for +91{}", mobile);

            Map<String, Object> ctx = new HashMap<>();
            ctx.put("mobileNumber", mobile);
            publishBusinessLog("OTP_EXPIRED", "OTP expired or not found for +91" + mobile, ctx);

            throw new BadRequestException("OTP expired or not found. Please request a new OTP.");
        }

        // Verify OTP against hash
        if (!passwordEncoder.matches(request.getOtp(), storedHashedOtp)) {
            // Increment attempt counter
            redisTemplate.opsForValue().set(attemptKey, String.valueOf(attemptCount + 1),
                    OTP_EXPIRY_MINUTES, TimeUnit.MINUTES);

            int remaining = MAX_OTP_ATTEMPTS - (attemptCount + 1);
            log.warn("Invalid OTP attempt for +91{}, {} remaining", mobile, remaining);

            Map<String, Object> ctx = new HashMap<>();
            ctx.put("mobileNumber", mobile);
            ctx.put("attemptsUsed", attemptCount + 1);
            ctx.put("remaining", remaining);
            publishBusinessLog("OTP_VERIFICATION_FAILED",
                    "Invalid OTP for +91" + mobile + ", " + remaining + " remaining", ctx);

            throw new BadRequestException("Invalid OTP. " + remaining + " attempt(s) remaining.");
        }

        // ═══════════════════════════════════════════════════════
        // OTP verified successfully — clean up Redis
        // ═══════════════════════════════════════════════════════
        redisTemplate.delete(otpKey);
        redisTemplate.delete(attemptKey);

        log.info("OTP verified successfully for +91{}", mobile);

        // Find or create user by mobile number
        boolean isNewUser = false;
        User user = userRepository.findByMobileNumber(mobile).orElse(null);

        if (user == null) {
            // Auto-register new user
            isNewUser = true;
            user = new User();
            user.setMobileNumber(mobile);
            user.setFullName(request.getFullName() != null ? request.getFullName() : "User");
            user.setAuthProvider(AuthProvider.PHONE);
            user.setIsActive(true);

            // ═══════════════════════════════════════════════════
            // Admin Number Check Logic
            // ═══════════════════════════════════════════════════
            if (mobile.equals(adminMobileNumber)) {
                user.setRole(Role.ROLE_ADMIN);
                log.info("★ Admin user auto-registered: +91{}", mobile);
            } else {
                user.setRole(Role.ROLE_USER);
            }

            user = userRepository.save(user);

            log.info("New user auto-registered via phone: +91{} (role={})", mobile, user.getRole());

            Map<String, Object> regContext = new HashMap<>();
            regContext.put("userId", user.getId());
            regContext.put("mobileNumber", mobile);
            regContext.put("authProvider", AuthProvider.PHONE.name());
            regContext.put("role", user.getRole().name());
            publishBusinessLog("USER_REGISTRATION",
                    "User registered via phone OTP: +91" + mobile, regContext);
        } else {
            // ═══════════════════════════════════════════════════
            // Admin enforcement on every login:
            //   - If number IS the admin number → ensure ROLE_ADMIN
            //   - If number is NOT admin → ensure ROLE_USER
            //   - If someone else had admin → strip it
            // ═══════════════════════════════════════════════════
            if (mobile.equals(adminMobileNumber)) {
                if (user.getRole() != Role.ROLE_ADMIN) {
                    user.setRole(Role.ROLE_ADMIN);
                    user = userRepository.save(user);
                    log.info("★ Admin role restored for +91{}", mobile);
                }
            } else {
                if (user.getRole() == Role.ROLE_ADMIN) {
                    // Non-admin number has admin role → override to ROLE_USER
                    user.setRole(Role.ROLE_USER);
                    user = userRepository.save(user);
                    log.warn("⚠ Admin role stripped from non-admin number +91{}", mobile);

                    Map<String, Object> ctx = new HashMap<>();
                    ctx.put("userId", user.getId());
                    ctx.put("mobileNumber", mobile);
                    ctx.put("adminNumber", adminMobileNumber);
                    publishBusinessLog("ADMIN_OVERRIDE",
                            "Admin role stripped from +91" + mobile + " — only " + adminMobileNumber + " is admin", ctx);
                }
            }

            // Ensure the canonical admin number always has ROLE_ADMIN in DB
            ensureAdminNumber();
        }

        // Check if account is active
        if (!user.getIsActive()) {
            throw new UnauthorizedException("Account is disabled");
        }

        // Log successful login
        Map<String, Object> context = new HashMap<>();
        context.put("userId", user.getId());
        context.put("mobileNumber", mobile);
        context.put("outcome", "SUCCESS");
        context.put("isNewUser", isNewUser);
        context.put("role", user.getRole().name());
        publishBusinessLog("LOGIN_ATTEMPT",
                "Phone OTP login successful: +91" + mobile, context);

        // Generate JWT tokens
        AuthResponse response = generateAuthResponse(user);
        response.setIsNewUser(isNewUser);
        return response;
    }

    /**
     * Ensures the admin mobile number always has ROLE_ADMIN in the database.
     * Called on every login to prevent any data corruption from removing admin access.
     */
    private void ensureAdminNumber() {
        userRepository.findByMobileNumber(adminMobileNumber).ifPresent(adminUser -> {
            if (adminUser.getRole() != Role.ROLE_ADMIN) {
                adminUser.setRole(Role.ROLE_ADMIN);
                userRepository.save(adminUser);
                log.info("★ Admin role re-ensured for admin number +91{}", adminMobileNumber);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // Google OAuth (retained)
    // ═══════════════════════════════════════════════════════════

    @Override
    @Transactional
    public AuthResponse authenticateWithGoogle(GoogleAuthRequest request) {
        log.info("=== Google Authentication Started ===");

        try {
            GoogleIdToken idToken = googleIdTokenVerifier.verify(request.getIdToken());
            if (idToken == null) {
                throw new UnauthorizedException("Invalid Google ID token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");

            // Find or create user
            boolean isNewUser = false;
            User user = userRepository.findByGoogleId(googleId).orElse(null);

            if (user == null) {
                isNewUser = true;
                user = createGoogleUser(googleId, email, name);

                Map<String, Object> regContext = new HashMap<>();
                regContext.put("userId", user.getId());
                regContext.put("email", email);
                regContext.put("authProvider", AuthProvider.GOOGLE.name());
                publishBusinessLog("USER_REGISTRATION",
                        "User registered via Google: " + email, regContext);
            }

            if (!user.getIsActive()) {
                throw new UnauthorizedException("Account is disabled");
            }

            Map<String, Object> oauthContext = new HashMap<>();
            oauthContext.put("userId", user.getId());
            oauthContext.put("outcome", "SUCCESS");
            oauthContext.put("authProvider", "GOOGLE");
            publishBusinessLog("OAUTH_AUTHENTICATION", "Google authentication successful", oauthContext);

            AuthResponse response = generateAuthResponse(user);
            response.setIsNewUser(isNewUser);
            response.setIsProfileComplete(
                    user.getMobileNumber() != null && !user.getMobileNumber().isEmpty());
            return response;

        } catch (GeneralSecurityException e) {
            throw new UnauthorizedException("Google authentication failed: Security error");
        } catch (IOException e) {
            throw new UnauthorizedException("Google authentication failed: Network error");
        } catch (Exception e) {
            throw new UnauthorizedException("Google authentication failed: " + e.getMessage());
        }
    }

    private User createGoogleUser(String googleId, String email, String name) {
        User user = new User();
        user.setGoogleId(googleId);
        user.setEmail(email);
        user.setEmailVerified(true); // Google emails are pre-verified
        user.setFullName(name);
        user.setMobileNumber("0000000000"); // Placeholder — user must complete profile
        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setRole(Role.ROLE_USER);
        user.setIsActive(true);
        user.setPassword(null);
        return userRepository.save(user);
    }

    // ═══════════════════════════════════════════════════════════
    // Token Management — NO database/Redis refresh token storage
    // ═══════════════════════════════════════════════════════════

    private AuthResponse generateAuthResponse(User user) {
        boolean isProfileComplete = user.getFullName() != null
                && !user.getFullName().isEmpty()
                && user.getMobileNumber() != null
                && !user.getMobileNumber().equals("0000000000");

        String accessToken = jwtUtil.generateAccessToken(
                user.getId(),
                user.getMobileNumber(),
                user.getRole().name(),
                isProfileComplete
        );

        // Refresh token is a signed JWT — stored ONLY in frontend localStorage
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getMobileNumber());

        Map<String, Object> context = new HashMap<>();
        context.put("userId", user.getId());
        context.put("mobileNumber", user.getMobileNumber());
        context.put("role", user.getRole().name());
        context.put("tokenType", "ACCESS_AND_REFRESH");
        publishBusinessLog("TOKEN_GENERATION",
                "Tokens generated for userId=" + user.getId(), context);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getAccessTokenExpiration() / 1000)
                .role(user.getRole())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .mobileNumber(user.getMobileNumber())
                .authProvider(user.getAuthProvider())
                .isProfileComplete(isProfileComplete)
                .id(user.getId())
                .build();
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        try {
            // Validate refresh token JWT (signature + expiry)
            Long userId = jwtUtil.validateRefreshToken(request.getRefreshToken());

            // Find user
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new UnauthorizedException("User not found"));

            if (!user.getIsActive()) {
                throw new UnauthorizedException("Account is disabled");
            }

            // Generate new access token (reuse same refresh token until it expires)
            boolean isProfileComplete = user.getMobileNumber() != null
                    && !user.getMobileNumber().equals("0000000000");

            String newAccessToken = jwtUtil.generateAccessToken(
                    user.getId(),
                    user.getMobileNumber(),
                    user.getRole().name(),
                    isProfileComplete
            );

            return AuthResponse.builder()
                    .accessToken(newAccessToken)
                    .refreshToken(request.getRefreshToken()) // Reuse same refresh token
                    .tokenType("Bearer")
                    .expiresIn(jwtUtil.getAccessTokenExpiration() / 1000)
                    .role(user.getRole())
                    .fullName(user.getFullName())
                    .email(user.getEmail())
                    .mobileNumber(user.getMobileNumber())
                    .authProvider(user.getAuthProvider())
                    .isProfileComplete(isProfileComplete)
                    .id(user.getId())
                    .build();

        } catch (Exception e) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }
    }

    @Override
    @Transactional
    public void logout(String token) {
        try {
            String jti = jwtUtil.extractJti(token);
            Long remainingTime = jwtUtil.getRemainingExpiration(token);

            // Blacklist access token in Redis
            String blacklistKey = "blacklist:" + jti;
            redisTemplate.opsForValue().set(blacklistKey, "true", remainingTime, TimeUnit.MILLISECONDS);
            log.info("Token blacklisted successfully");
        } catch (Exception e) {
            log.error("Failed to blacklist token", e);
            throw new BadRequestException("Failed to logout");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════

    private String generateSecureOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    private void publishBusinessLog(String eventType, String message, Map<String, Object> context) {
        try {
            LogEvent logEvent = LogEvent.builder()
                    .serviceName("user-service")
                    .level("INFO")
                    .logger(this.getClass().getName())
                    .message(message)
                    .eventType(eventType)
                    .context(context)
                    .timestamp(LocalDateTime.now())
                    .build();
            logEventPublisher.publish(logEvent);
        } catch (Exception e) {
            log.error("Failed to publish business log event: {}", eventType, e);
        }
    }
}
