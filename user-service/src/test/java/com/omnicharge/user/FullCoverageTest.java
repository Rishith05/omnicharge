package com.omnicharge.user;

import com.omnicharge.user.config.OpenApiConfig;
import com.omnicharge.user.entity.AuthProvider;
import com.omnicharge.user.entity.RefreshToken;
import com.omnicharge.user.entity.Role;
import com.omnicharge.user.entity.User;
import com.omnicharge.user.dto.*;
import com.omnicharge.user.service.IAuthService;
import com.omnicharge.user.service.IEmailService;
import com.omnicharge.user.service.IPasswordResetService;
import com.omnicharge.user.service.ISmsService;
import com.omnicharge.user.service.IUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.Instant;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

class FullCoverageTest {

    // ═══════════════════════════════════════════════════════════
    // OpenApiConfig
    // ═══════════════════════════════════════════════════════════

    @Test
    void openApiConfig_canBeInstantiated() {
        OpenApiConfig config = new OpenApiConfig();
        assertThat(config).isNotNull();
    }

    // ═══════════════════════════════════════════════════════════
    // UserServiceApplication
    // ═══════════════════════════════════════════════════════════

    @Test
    void userServiceApplication_canBeInstantiated() {
        UserServiceApplication app = new UserServiceApplication();
        assertThat(app).isNotNull();
    }

    // ═══════════════════════════════════════════════════════════
    // User Entity
    // ═══════════════════════════════════════════════════════════

    @Test
    void user_gettersAndSetters() {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@omnicharge.com");
        user.setFullName("Test User");
        user.setMobileNumber("9876543210");
        user.setPassword("$2a$10$hash");
        user.setGoogleId("google-123");
        user.setEmailVerified(true);
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setRole(Role.ROLE_USER);
        user.setIsActive(true);

        assertEquals(1L, user.getId());
        assertEquals("test@omnicharge.com", user.getEmail());
        assertEquals("Test User", user.getFullName());
        assertEquals("9876543210", user.getMobileNumber());
        assertEquals("$2a$10$hash", user.getPassword());
        assertEquals("google-123", user.getGoogleId());
        assertTrue(user.getEmailVerified());
        assertEquals(AuthProvider.LOCAL, user.getAuthProvider());
        assertEquals(Role.ROLE_USER, user.getRole());
        assertTrue(user.getIsActive());
    }

    @Test
    void user_allArgsConstructor() {
        User user = new User(1L, "email@test.com", "Name", "9876543210", 
                "pass", "gid", true, AuthProvider.GOOGLE, Role.ROLE_ADMIN, true);
        assertNotNull(user);
        assertEquals(1L, user.getId());
        assertEquals("email@test.com", user.getEmail());
        assertEquals("Name", user.getFullName());
        assertEquals("9876543210", user.getMobileNumber());
        assertEquals("pass", user.getPassword());
        assertEquals("gid", user.getGoogleId());
        assertTrue(user.getEmailVerified());
        assertEquals(AuthProvider.GOOGLE, user.getAuthProvider());
        assertEquals(Role.ROLE_ADMIN, user.getRole());
        assertTrue(user.getIsActive());
    }

    @Test
    void user_noArgsConstructor() {
        User user = new User();
        assertNotNull(user);
        assertNull(user.getId());
        assertNull(user.getEmail());
    }

    @Test
    void user_defaultValues() {
        User user = new User();
        // Default values from entity definition
        assertEquals(Role.ROLE_USER, user.getRole());
        assertEquals(true, user.getIsActive());
        assertEquals(false, user.getEmailVerified());
    }

    // ═══════════════════════════════════════════════════════════
    // RefreshToken Entity
    // ═══════════════════════════════════════════════════════════

    @Test
    void refreshToken_gettersAndSetters() {
        User user = new User();
        user.setId(1L);

        RefreshToken token = new RefreshToken();
        token.setId(1L);
        token.setToken("refresh-token-string");
        token.setExpiryDate(Instant.now().plusSeconds(3600));
        token.setUser(user);

        assertEquals(1L, token.getId());
        assertEquals("refresh-token-string", token.getToken());
        assertNotNull(token.getExpiryDate());
        assertEquals(user, token.getUser());
    }

    @Test
    void refreshToken_allArgsConstructor() {
        User user = new User();
        user.setId(1L);
        Instant expiry = Instant.now().plusSeconds(3600);

        RefreshToken token = new RefreshToken(1L, "token123", expiry, user);
        assertEquals(1L, token.getId());
        assertEquals("token123", token.getToken());
        assertEquals(expiry, token.getExpiryDate());
        assertEquals(user, token.getUser());
    }

    @Test
    void refreshToken_noArgsConstructor() {
        RefreshToken token = new RefreshToken();
        assertNotNull(token);
        assertNull(token.getId());
        assertNull(token.getToken());
    }

    // ═══════════════════════════════════════════════════════════
    // AuthProvider Enum
    // ═══════════════════════════════════════════════════════════

    @ParameterizedTest
    @EnumSource(AuthProvider.class)
    void authProvider_allValuesExist(AuthProvider provider) {
        assertNotNull(provider);
        assertNotNull(provider.name());
    }

    @Test
    void authProvider_valueOf() {
        assertEquals(AuthProvider.LOCAL, AuthProvider.valueOf("LOCAL"));
        assertEquals(AuthProvider.GOOGLE, AuthProvider.valueOf("GOOGLE"));
        assertEquals(AuthProvider.PHONE, AuthProvider.valueOf("PHONE"));
    }

    @Test
    void authProvider_values() {
        AuthProvider[] values = AuthProvider.values();
        assertTrue(values.length >= 3);
    }

    // ═══════════════════════════════════════════════════════════
    // Role Enum
    // ═══════════════════════════════════════════════════════════

    @ParameterizedTest
    @EnumSource(Role.class)
    void role_allValuesExist(Role role) {
        assertNotNull(role);
        assertNotNull(role.name());
    }

    @Test
    void role_valueOf() {
        assertEquals(Role.ROLE_USER, Role.valueOf("ROLE_USER"));
        assertEquals(Role.ROLE_ADMIN, Role.valueOf("ROLE_ADMIN"));
    }

    @Test
    void role_values() {
        Role[] values = Role.values();
        assertTrue(values.length >= 2);
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - SendOtpRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void sendOtpRequest_gettersSetters() {
        SendOtpRequest req = new SendOtpRequest();
        req.setMobileNumber("9876543210");
        assertEquals("9876543210", req.getMobileNumber());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - VerifyPhoneOtpRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void verifyPhoneOtpRequest_gettersSetters() {
        VerifyPhoneOtpRequest req = new VerifyPhoneOtpRequest();
        req.setMobileNumber("9876543210");
        req.setOtp("123456");
        req.setFullName("Test");
        assertEquals("9876543210", req.getMobileNumber());
        assertEquals("123456", req.getOtp());
        assertEquals("Test", req.getFullName());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - GoogleAuthRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void googleAuthRequest_gettersSetters() {
        GoogleAuthRequest req = new GoogleAuthRequest();
        req.setIdToken("google-id-token");
        assertEquals("google-id-token", req.getIdToken());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - RefreshTokenRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void refreshTokenRequest_gettersSetters() {
        RefreshTokenRequest req = new RefreshTokenRequest();
        req.setRefreshToken("refresh-token");
        assertEquals("refresh-token", req.getRefreshToken());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - ForgotPasswordRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void forgotPasswordRequest_gettersSetters() {
        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail("test@test.com");
        assertEquals("test@test.com", req.getEmail());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - VerifyOtpRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void verifyOtpRequest_gettersSetters() {
        VerifyOtpRequest req = new VerifyOtpRequest("test@test.com", "123456");
        assertEquals("test@test.com", req.getEmail());
        assertEquals("123456", req.getOtp());
    }

    @Test
    void verifyOtpRequest_noArgs() {
        VerifyOtpRequest req = new VerifyOtpRequest();
        assertNotNull(req);
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - ResetPasswordRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void resetPasswordRequest_gettersSetters() {
        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setEmail("test@test.com");
        req.setOtp("123456");
        req.setNewPassword("newPass123");
        assertEquals("test@test.com", req.getEmail());
        assertEquals("123456", req.getOtp());
        assertEquals("newPass123", req.getNewPassword());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - LoginRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void loginRequest_gettersSetters() {
        LoginRequest req = new LoginRequest();
        req.setEmail("test@test.com");
        req.setPassword("password123");
        assertEquals("test@test.com", req.getEmail());
        assertEquals("password123", req.getPassword());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - RegisterRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void registerRequest_gettersSetters() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("test@test.com");
        req.setPassword("password123");
        req.setFullName("Test User");
        req.setMobileNumber("9876543210");
        assertEquals("test@test.com", req.getEmail());
        assertEquals("password123", req.getPassword());
        assertEquals("Test User", req.getFullName());
        assertEquals("9876543210", req.getMobileNumber());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - UpdateProfileRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void updateProfileRequest_gettersSetters() {
        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setFullName("Updated Name");
        req.setMobileNumber("8765432109");
        assertEquals("Updated Name", req.getFullName());
        assertEquals("8765432109", req.getMobileNumber());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - ChangePasswordRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void changePasswordRequest_gettersSetters() {
        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("oldPass");
        req.setNewPassword("newPass");
        assertEquals("oldPass", req.getCurrentPassword());
        assertEquals("newPass", req.getNewPassword());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - AuthResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void authResponse_builder() {
        AuthResponse response = AuthResponse.builder()
                .accessToken("access")
                .refreshToken("refresh")
                .tokenType("Bearer")
                .expiresIn(3600L)
                .role(Role.ROLE_USER)
                .fullName("Test")
                .email("test@test.com")
                .mobileNumber("9876543210")
                .authProvider(AuthProvider.PHONE)
                .isProfileComplete(true)
                .isNewUser(false)
                .id(1L)
                .build();

        assertEquals("access", response.getAccessToken());
        assertEquals("refresh", response.getRefreshToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals(3600L, response.getExpiresIn());
        assertEquals(Role.ROLE_USER, response.getRole());
        assertEquals("Test", response.getFullName());
        assertEquals("test@test.com", response.getEmail());
        assertEquals("9876543210", response.getMobileNumber());
        assertEquals(AuthProvider.PHONE, response.getAuthProvider());
        assertTrue(response.getIsProfileComplete());
        assertFalse(response.getIsNewUser());
        assertEquals(1L, response.getId());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - UserProfileResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void userProfileResponse_builder() {
        LocalDateTime now = LocalDateTime.now();
        UserProfileResponse response = UserProfileResponse.builder()
                .id(1L)
                .email("test@test.com")
                .fullName("Test User")
                .mobileNumber("9876543210")
                .role(Role.ROLE_USER)
                .authProvider(AuthProvider.PHONE)
                .isActive(true)
                .createdDate(now)
                .build();

        assertEquals(1L, response.getId());
        assertEquals("test@test.com", response.getEmail());
        assertEquals("Test User", response.getFullName());
        assertEquals("9876543210", response.getMobileNumber());
        assertEquals(Role.ROLE_USER, response.getRole());
        assertEquals(AuthProvider.PHONE, response.getAuthProvider());
        assertTrue(response.getIsActive());
        assertEquals(now, response.getCreatedDate());
    }

    // ═══════════════════════════════════════════════════════════
    // Interface method coverage (IAuthService, IUserService etc.)
    // ═══════════════════════════════════════════════════════════

    @Test
    void iAuthService_isInterface() {
        assertTrue(IAuthService.class.isInterface());
    }

    @Test
    void iUserService_isInterface() {
        assertTrue(IUserService.class.isInterface());
    }

    @Test
    void iEmailService_isInterface() {
        assertTrue(IEmailService.class.isInterface());
    }

    @Test
    void iSmsService_isInterface() {
        assertTrue(ISmsService.class.isInterface());
    }

    @Test
    void iPasswordResetService_isInterface() {
        assertTrue(IPasswordResetService.class.isInterface());
    }
}
