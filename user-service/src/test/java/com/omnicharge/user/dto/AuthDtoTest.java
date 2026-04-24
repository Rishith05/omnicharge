package com.omnicharge.user.dto;

import com.omnicharge.user.entity.AuthProvider;
import com.omnicharge.user.entity.Role;
import com.omnicharge.user.entity.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class AuthDtoTest {

    @Test
    void testUserModelBoilerplate() {
        User user = new User();
        user.setId(1L);
        user.setEmail("a@b.com");
        user.setEmailVerified(true);
        user.setPassword("p");
        user.setFullName("N");
        user.setMobileNumber("M");
        user.setRole(Role.ROLE_USER);
        user.setAuthProvider(AuthProvider.PHONE);
        user.setGoogleId("G");
        user.setIsActive(true);
        user.setCreatedDate(LocalDateTime.now());
        user.setLastModifiedDate(LocalDateTime.now());

        assertEquals(1L, user.getId());
        assertEquals("a@b.com", user.getEmail());
        assertTrue(user.getEmailVerified());
        assertEquals("p", user.getPassword());
        assertEquals("N", user.getFullName());
        assertEquals("M", user.getMobileNumber());
        assertEquals(Role.ROLE_USER, user.getRole());
        assertEquals(AuthProvider.PHONE, user.getAuthProvider());
        assertEquals("G", user.getGoogleId());
        assertTrue(user.getIsActive());
        assertNotNull(user.getCreatedDate());
    }

    @Test
    void testAuthDtos() {
        AuthResponse res = AuthResponse.builder()
                .accessToken("at")
                .refreshToken("rt")
                .tokenType("Bearer")
                .expiresIn(3600L)
                .role(Role.ROLE_ADMIN)
                .fullName("F")
                .email("E")
                .mobileNumber("M")
                .authProvider(AuthProvider.LOCAL)
                .isProfileComplete(true)
                .isNewUser(false)
                .id(1L)
                .build();
        
        assertEquals("at", res.getAccessToken());
        assertEquals(Role.ROLE_ADMIN, res.getRole());
        assertTrue(res.getIsProfileComplete());

        GoogleAuthRequest gar = new GoogleAuthRequest("token");
        assertEquals("token", gar.getIdToken());

        RefreshTokenRequest rtr = new RefreshTokenRequest("token");
        assertEquals("token", rtr.getRefreshToken());

        SendOtpRequest sor = new SendOtpRequest("123");
        assertEquals("123", sor.getMobileNumber());

        VerifyPhoneOtpRequest vpo = new VerifyPhoneOtpRequest("M", "O", "N");
        assertEquals("M", vpo.getMobileNumber());
        assertEquals("O", vpo.getOtp());
    }
}
