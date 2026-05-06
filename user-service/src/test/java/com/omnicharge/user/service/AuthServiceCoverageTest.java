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
import java.util.concurrent.TimeUnit;

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
    void verifyOtp_MaxAttemptsExceeded_ThrowsException() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp_attempts:9876543210")).thenReturn("3");

        assertThrows(BadRequestException.class, () -> authService.verifyOtp(new VerifyPhoneOtpRequest("9876543210", "123456", "Name")));
    }

    @Test
    void authenticateWithGoogle_ExistingUserSuccess() throws GeneralSecurityException, IOException {
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("test@gmail.com");
        payload.setSubject("google-123");
        payload.set("name", "Test User");
        
        GoogleIdToken idToken = mock(GoogleIdToken.class);
        when(idToken.getPayload()).thenReturn(payload);
        when(googleIdTokenVerifier.verify(anyString())).thenReturn(idToken);
        
        User user = new User();
        user.setId(1L);
        user.setEmail("test@gmail.com");
        user.setRole(Role.ROLE_USER);
        user.setIsActive(true);
        when(userRepository.findByGoogleId("google-123")).thenReturn(Optional.of(user));
        when(jwtUtil.generateAccessToken(anyLong(), any(), any(), anyBoolean())).thenReturn("token");
        when(jwtUtil.generateRefreshToken(anyLong(), any())).thenReturn("refresh");

        AuthResponse response = authService.authenticateWithGoogle(new GoogleAuthRequest("valid_token"));
        
        assertNotNull(response);
        assertEquals("test@gmail.com", response.getEmail());
    }

    @Test
    void authenticateWithGoogle_AccountDisabled_ThrowsException() throws GeneralSecurityException, IOException {
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("test@gmail.com");
        payload.setSubject("google-123");
        
        GoogleIdToken idToken = mock(GoogleIdToken.class);
        when(idToken.getPayload()).thenReturn(payload);
        when(googleIdTokenVerifier.verify(anyString())).thenReturn(idToken);
        
        User user = new User();
        user.setIsActive(false); // Account disabled
        when(userRepository.findByGoogleId("google-123")).thenReturn(Optional.of(user));

        // It throws UnauthorizedException because account is disabled
        assertThrows(UnauthorizedException.class, () -> authService.authenticateWithGoogle(new GoogleAuthRequest("token")));
    }

    @Test
    void logout_Success() {
        when(jwtUtil.extractJti("token")).thenReturn("jti");
        when(jwtUtil.getRemainingExpiration("token")).thenReturn(1000L);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        authService.logout("token");
        verify(valueOperations).set("blacklist:jti", "true", 1000L, TimeUnit.MILLISECONDS);
    }

    @Test
    void refreshToken_Success() {
        when(jwtUtil.validateRefreshToken("refresh")).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(jwtUtil.generateAccessToken(anyLong(), any(), any(), anyBoolean())).thenReturn("new_token");

        AuthResponse response = authService.refreshToken(new RefreshTokenRequest("refresh"));
        assertNotNull(response);
        assertEquals("new_token", response.getAccessToken());
    }
}
