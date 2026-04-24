package com.omnicharge.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnicharge.user.dto.*;
import com.omnicharge.user.entity.AuthProvider;
import com.omnicharge.user.entity.Role;
import com.omnicharge.user.service.IAuthService;
import com.omnicharge.user.service.IPasswordResetService;
import com.omnicharge.common.logging.LogEventPublisher;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private IAuthService authService;

    @MockitoBean
    private IPasswordResetService passwordResetService;

    @MockitoBean
    private LogEventPublisher logEventPublisher;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMappingContext;

    @MockitoBean
    private org.springframework.data.redis.core.RedisTemplate<String, String> redisTemplate;

    private SendOtpRequest sendOtpRequest;
    private VerifyPhoneOtpRequest verifyPhoneOtpRequest;
    private AuthResponse authResponse;

    @BeforeEach
    void setUp() {
        sendOtpRequest = new SendOtpRequest("9876543210");

        verifyPhoneOtpRequest = new VerifyPhoneOtpRequest("9876543210", "123456", "Test User");

        authResponse = AuthResponse.builder()
                .accessToken("mock-access-token")
                .refreshToken("mock-refresh-token")
                .tokenType("Bearer")
                .expiresIn(3600L)
                .role(Role.ROLE_USER)
                .fullName("Test User")
                .mobileNumber("9876543210")
                .authProvider(AuthProvider.PHONE)
                .isProfileComplete(true)
                .build();
    }

    @Test
    void sendOtp_Success() throws Exception {
        doNothing().when(authService).sendOtp(any(SendOtpRequest.class));

        mockMvc.perform(post("/api/auth/send-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sendOtpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("OTP sent to your phone number. Valid for 5 minutes."));
    }

    @Test
    void verifyPhoneOtp_Success() throws Exception {
        when(authService.verifyOtp(any(VerifyPhoneOtpRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/verify-phone-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(verifyPhoneOtpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mock-access-token"))
                .andExpect(jsonPath("$.data.mobileNumber").value("9876543210"));
    }

    @Test
    void forgotPassword_Success() throws Exception {
        ForgotPasswordRequest request = new ForgotPasswordRequest("test@example.com");
        doNothing().when(passwordResetService).forgotPassword(any(ForgotPasswordRequest.class));

        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("OTP sent to your email"));
    }

    @Test
    void logout_Success() throws Exception {
        doNothing().when(authService).logout(anyString());

        mockMvc.perform(post("/api/auth/logout")
                .header("Authorization", "Bearer mock-access-token")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Logout successful"));
        
        verify(authService, times(1)).logout("mock-access-token");
    }
}
