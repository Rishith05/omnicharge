package com.omnicharge.user.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.omnicharge.common.exception.BadRequestException;
import com.omnicharge.common.exception.UnauthorizedException;
import com.omnicharge.common.logging.LogEvent;
import com.omnicharge.common.logging.LogEventPublisher;
import com.omnicharge.user.dto.*;
import com.omnicharge.user.entity.AuthProvider;
import com.omnicharge.user.entity.Role;
import com.omnicharge.user.entity.User;
import com.omnicharge.user.repository.UserRepository;
import com.omnicharge.user.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceCoverageTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private GoogleIdTokenVerifier googleIdTokenVerifier;
    @Mock
    private RedisTemplate<String, String> redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private LogEventPublisher logEventPublisher;
    @Mock
    private ISmsService smsService;

    private AuthService authService;
    private User sampleUser;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                jwtUtil,
                googleIdTokenVerifier,
                redisTemplate,
                logEventPublisher,
                smsService
        );
        ReflectionTestUtils.setField(authService, "adminMobileNumber", "8688179553");

        sampleUser = new User();
        sampleUser.setId(1L);
        sampleUser.setMobileNumber("9876543210");
        sampleUser.setRole(Role.ROLE_USER);
        sampleUser.setIsActive(true);
        sampleUser.setAuthProvider(AuthProvider.PHONE);
    }

    @Test
    void sendOtp_HourlyLimitExceeded_ThrowsException() {
        when(redisTemplate.hasKey(anyString())).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp_hourly:9876543210")).thenReturn("5"); // Limit is 5

        assertThrows(BadRequestException.class, () -> authService.sendOtp(new SendOtpRequest("9876543210")));
    }

    @Test
    void verifyOtp_OtpExpired_ThrowsException() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp_attempts:9876543210")).thenReturn("0");
        when(valueOperations.get("phone_otp:9876543210")).thenReturn(null);

        assertThrows(BadRequestException.class, () -> authService.verifyOtp(new VerifyPhoneOtpRequest("9876543210", "123456", "Name")));
    }

    @Test
    void verifyOtp_AccountDisabled_ThrowsException() {
        sampleUser.setIsActive(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp_attempts:9876543210")).thenReturn("0");
        when(valueOperations.get("phone_otp:9876543210")).thenReturn("hashed");
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(userRepository.findByMobileNumber("9876543210")).thenReturn(Optional.of(sampleUser));

        assertThrows(UnauthorizedException.class, () -> authService.verifyOtp(new VerifyPhoneOtpRequest("9876543210", "123456", "Name")));
    }

    @Test
    void verifyOtp_AdminAutoRegistration() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp_attempts:8688179553")).thenReturn("0");
        when(valueOperations.get("phone_otp:8688179553")).thenReturn("hashed");
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(userRepository.findByMobileNumber("8688179553")).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(999L);
            return u;
        });

        AuthResponse response = authService.verifyOtp(new VerifyPhoneOtpRequest("8688179553", "123456", "Admin"));
        
        assertEquals(Role.ROLE_ADMIN, response.getRole());
    }

    @Test
    void verifyOtp_AdminStripRoleFromRegularUser() {
        sampleUser.setRole(Role.ROLE_ADMIN); // Improperly has admin role
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp_attempts:9876543210")).thenReturn("0");
        when(valueOperations.get("phone_otp:9876543210")).thenReturn("hashed");
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(userRepository.findByMobileNumber("9876543210")).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any())).thenReturn(sampleUser);

        authService.verifyOtp(new VerifyPhoneOtpRequest("9876543210", "123456", "Name"));
        
        assertEquals(Role.ROLE_USER, sampleUser.getRole());
    }

    @Test
    void authenticateWithGoogle_InvalidToken_ThrowsException() throws GeneralSecurityException, IOException {
        when(googleIdTokenVerifier.verify(anyString())).thenReturn(null);
        assertThrows(UnauthorizedException.class, () -> authService.authenticateWithGoogle(new GoogleAuthRequest("invalid")));
    }

    @Test
    void refreshToken_UserNotFound_ThrowsException() {
        when(jwtUtil.validateRefreshToken(anyString())).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(UnauthorizedException.class, () -> authService.refreshToken(new RefreshTokenRequest("jwt")));
    }

    @Test
    void logout_Failure_ThrowsException() {
        when(jwtUtil.extractJti(anyString())).thenThrow(new RuntimeException("JWT error"));
        assertThrows(BadRequestException.class, () -> authService.logout("token"));
    }

    @Test
    void publishBusinessLog_CatchBlock_DoesNotThrow() {
        when(redisTemplate.hasKey(anyString())).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        doThrow(new RuntimeException("Log Failed")).when(logEventPublisher).publish(any());

        assertDoesNotThrow(() -> authService.sendOtp(new SendOtpRequest("9876543210")));
    }
}
