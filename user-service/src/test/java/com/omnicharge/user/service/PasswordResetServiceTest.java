package com.omnicharge.user.service;

import com.omnicharge.common.exception.BadRequestException;
import com.omnicharge.common.exception.ResourceNotFoundException;
import com.omnicharge.common.logging.LogEventPublisher;
import com.omnicharge.user.dto.ForgotPasswordRequest;
import com.omnicharge.user.dto.ResetPasswordRequest;
import com.omnicharge.user.dto.VerifyOtpRequest;
import com.omnicharge.user.entity.AuthProvider;
import com.omnicharge.user.entity.User;
import com.omnicharge.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PasswordResetServiceTest {

    private PasswordResetService service;

    @Mock
    private UserRepository userRepository;
    @Mock
    private IEmailService emailService;
    @Mock
    private RedisTemplate<String, String> redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private LogEventPublisher logEventPublisher;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        service = new PasswordResetService(userRepository, emailService, redisTemplate, passwordEncoder, logEventPublisher);
    }

    @Test
    void forgotPassword_Success() {
        User user = new User();
        user.setEmail("a@b.com");
        user.setAuthProvider(AuthProvider.LOCAL);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));

        service.forgotPassword(new ForgotPasswordRequest("a@b.com"));

        verify(valueOperations).set(eq("otp:a@b.com"), anyString(), eq(5L), eq(TimeUnit.MINUTES));
        verify(emailService).sendOtpEmail(anyString(), anyString());
    }

    @Test
    void forgotPassword_UserNotFound() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.forgotPassword(new ForgotPasswordRequest("a@b.com")));
    }

    @Test
    void forgotPassword_SocialAuth() {
        User user = new User();
        user.setAuthProvider(AuthProvider.GOOGLE);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));
        assertThrows(BadRequestException.class, () -> service.forgotPassword(new ForgotPasswordRequest("a@b.com")));
    }

    @Test
    void verifyOtp_Success() {
        when(valueOperations.get(anyString())).thenReturn("123456");
        assertTrue(service.verifyOtp(new VerifyOtpRequest("a@b.com", "123456")));
    }

    @Test
    void verifyOtp_Expired() {
        when(valueOperations.get(anyString())).thenReturn(null);
        assertThrows(BadRequestException.class, () -> service.verifyOtp(new VerifyOtpRequest("a@b.com", "123456")));
    }

    @Test
    void verifyOtp_Invalid() {
        when(valueOperations.get(anyString())).thenReturn("654321");
        assertThrows(BadRequestException.class, () -> service.verifyOtp(new VerifyOtpRequest("a@b.com", "123456")));
    }

    @Test
    void resetPassword_Success() {
        User user = new User();
        user.setEmail("a@b.com");
        user.setAuthProvider(AuthProvider.LOCAL);
        when(valueOperations.get(anyString())).thenReturn("123456");
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));
        
        service.resetPassword(new ResetPasswordRequest("a@b.com", "123456", "newPass"));
        
        verify(passwordEncoder).encode("newPass");
        verify(userRepository).save(user);
        verify(redisTemplate).delete("otp:a@b.com");
    }
}
