package com.omnicharge.user.service;

import com.omnicharge.common.exception.BadRequestException;
import com.omnicharge.common.exception.UnauthorizedException;
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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @Mock
    private JwtUtil jwtUtil;
    
    @Mock
    private com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier googleIdTokenVerifier;
    
    @Mock
    private RedisTemplate<String, String> redisTemplate;
    
    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private LogEventPublisher logEventPublisher;

    @Mock
    private ISmsService smsService;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");
        testUser.setMobileNumber("9876543210");
        testUser.setRole(Role.ROLE_USER);
        testUser.setAuthProvider(AuthProvider.PHONE);
        testUser.setIsActive(true);
    }

    @Test
    void sendOtp_Success() {
        when(redisTemplate.hasKey("otp_rate:9876543210")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashedOtp");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        SendOtpRequest request = new SendOtpRequest("9876543210");
        authService.sendOtp(request);

        verify(smsService, times(1)).sendOtp(eq("9876543210"), anyString());
        verify(valueOperations, times(4)).set(anyString(), anyString(), anyLong(), any(TimeUnit.class));
    }

    @Test
    void sendOtp_RateLimited() {
        when(redisTemplate.hasKey("otp_rate:9876543210")).thenReturn(true);

        SendOtpRequest request = new SendOtpRequest("9876543210");
        assertThrows(BadRequestException.class, () -> authService.sendOtp(request));
        verify(smsService, never()).sendOtp(anyString(), anyString());
    }

    @Test
    void verifyOtp_Success() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp_attempts:9876543210")).thenReturn("0");
        when(valueOperations.get("phone_otp:9876543210")).thenReturn("hashedOtp");
        when(passwordEncoder.matches("123456", "hashedOtp")).thenReturn(true);
        when(userRepository.findByMobileNumber("9876543210")).thenReturn(Optional.of(testUser));
        when(jwtUtil.generateAccessToken(eq(1L), eq("9876543210"), eq("ROLE_USER"), anyBoolean()))
                .thenReturn("access-token");
        when(jwtUtil.generateRefreshToken(1L, "9876543210")).thenReturn("refresh-token");
        when(jwtUtil.getAccessTokenExpiration()).thenReturn(900000L);
        when(redisTemplate.delete("phone_otp:9876543210")).thenReturn(true);
        when(redisTemplate.delete("otp_attempts:9876543210")).thenReturn(true);

        VerifyPhoneOtpRequest request = new VerifyPhoneOtpRequest("9876543210", "123456", null);
        AuthResponse response = authService.verifyOtp(request);

        assertNotNull(response);
        assertEquals("access-token", response.getAccessToken());
        assertEquals("refresh-token", response.getRefreshToken());
    }

    @Test
    void verifyOtp_InvalidOtp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp_attempts:9876543210")).thenReturn("0");
        when(valueOperations.get("phone_otp:9876543210")).thenReturn("hashedOtp");
        when(passwordEncoder.matches("000000", "hashedOtp")).thenReturn(false);

        VerifyPhoneOtpRequest request = new VerifyPhoneOtpRequest("9876543210", "000000", null);
        assertThrows(BadRequestException.class, () -> authService.verifyOtp(request));
    }

    @Test
    void verifyOtp_MaxAttemptsExceeded() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp_attempts:9876543210")).thenReturn("3");

        VerifyPhoneOtpRequest request = new VerifyPhoneOtpRequest("9876543210", "123456", null);
        assertThrows(BadRequestException.class, () -> authService.verifyOtp(request));
    }

    @Test
    void verifyOtp_NewUserAutoRegistered() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("otp_attempts:9876543210")).thenReturn("0");
        when(valueOperations.get("phone_otp:9876543210")).thenReturn("hashedOtp");
        when(passwordEncoder.matches("123456", "hashedOtp")).thenReturn(true);
        when(userRepository.findByMobileNumber("9876543210")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtUtil.generateAccessToken(eq(1L), eq("9876543210"), eq("ROLE_USER"), anyBoolean()))
                .thenReturn("access-token");
        when(jwtUtil.generateRefreshToken(1L, "9876543210")).thenReturn("refresh-token");
        when(jwtUtil.getAccessTokenExpiration()).thenReturn(900000L);
        when(redisTemplate.delete("phone_otp:9876543210")).thenReturn(true);
        when(redisTemplate.delete("otp_attempts:9876543210")).thenReturn(true);

        VerifyPhoneOtpRequest request = new VerifyPhoneOtpRequest("9876543210", "123456", "New User");
        AuthResponse response = authService.verifyOtp(request);

        assertNotNull(response);
        assertTrue(response.getIsNewUser());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void refreshToken_Success() {
        RefreshTokenRequest request = new RefreshTokenRequest("valid-refresh-jwt");
        when(jwtUtil.validateRefreshToken("valid-refresh-jwt")).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(jwtUtil.generateAccessToken(eq(1L), eq("9876543210"), eq("ROLE_USER"), anyBoolean()))
                .thenReturn("new-access-token");
        when(jwtUtil.getAccessTokenExpiration()).thenReturn(900000L);

        AuthResponse response = authService.refreshToken(request);

        assertNotNull(response);
        assertEquals("new-access-token", response.getAccessToken());
        assertEquals("valid-refresh-jwt", response.getRefreshToken());
    }

    @Test
    void logout_Success() {
        when(jwtUtil.extractJti("some-jwt-token")).thenReturn("token-jti");
        when(jwtUtil.getRemainingExpiration("some-jwt-token")).thenReturn(1000L);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        authService.logout("some-jwt-token");

        verify(valueOperations, times(1)).set("blacklist:token-jti", "true", 1000L, TimeUnit.MILLISECONDS);
    }
}
