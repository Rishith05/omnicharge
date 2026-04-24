package com.omnicharge.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnicharge.user.dto.*;
import com.omnicharge.user.service.IAuthService;
import com.omnicharge.user.service.IPasswordResetService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerCoverageTest {

    @MockitoBean
    private IAuthService authService;
    @MockitoBean
    private IPasswordResetService passwordResetService;
    @MockitoBean
    private RedisTemplate<String, String> redisTemplate;
    @MockitoBean
    private ValueOperations<String, String> valueOperations;
    @MockitoBean
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;
    @MockitoBean
    private org.springframework.data.jpa.mapping.JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void phoneOtpFlow() throws Exception {
        SendOtpRequest sor = new SendOtpRequest("9876543210");
        VerifyPhoneOtpRequest vpo = new VerifyPhoneOtpRequest("9876543210", "123456", "Name");

        mockMvc.perform(post("/api/auth/send-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sor)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/verify-phone-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(vpo)))
                .andExpect(status().isOk());
    }

    @Test
    void googleAndTokens() throws Exception {
        GoogleAuthRequest gar = new GoogleAuthRequest("token");
        RefreshTokenRequest rtr = new RefreshTokenRequest("token");

        mockMvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(gar)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/refresh-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(rtr)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/logout")
                .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk());
    }

    @Test
    void devOtp_Found() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn("123456");

        mockMvc.perform(get("/api/auth/dev-otp/9876543210"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("123456"));
    }

    @Test
    void devOtp_NotFound() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);

        mockMvc.perform(get("/api/auth/dev-otp/9876543210"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist());
    }
}
