package com.omnicharge.user.dto;

import com.omnicharge.user.entity.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

class DataModelCoverageTest {

    @Test
    void testUserModel() {
        User u = new User();
        u.setId(1L);
        u.setEmail("e@e.com");
        u.setFullName("F");
        u.setMobileNumber("9876543210");
        u.setPassword("p");
        u.setGoogleId("g");
        u.setEmailVerified(true);
        u.setAuthProvider(AuthProvider.LOCAL);
        u.setRole(Role.ROLE_USER);
        u.setIsActive(true);
        u.setCreatedDate(LocalDateTime.now());
        u.setLastModifiedDate(LocalDateTime.now());

        assertEquals(1L, u.getId());
        assertEquals("e@e.com", u.getEmail());
        assertEquals("F", u.getFullName());
        assertEquals("9876543210", u.getMobileNumber());
        assertEquals("p", u.getPassword());
        assertEquals("g", u.getGoogleId());
        assertTrue(u.getEmailVerified());
        assertEquals(AuthProvider.LOCAL, u.getAuthProvider());
        assertEquals(Role.ROLE_USER, u.getRole());
        assertTrue(u.getIsActive());
        assertNotNull(u.getCreatedDate());
    }

    @Test
    void testAuthDtos() {
        AuthResponse res = AuthResponse.builder()
                .accessToken("a").refreshToken("r").tokenType("B").expiresIn(1L).role(Role.ROLE_ADMIN)
                .fullName("F").email("E").mobileNumber("M").authProvider(AuthProvider.GOOGLE)
                .isProfileComplete(true).isNewUser(false).id(1L)
                .build();
        assertEquals("a", res.getAccessToken());
        
        ForgotPasswordRequest fr = new ForgotPasswordRequest("e@e.com");
        assertEquals("e@e.com", fr.getEmail());

        GoogleAuthRequest gar = new GoogleAuthRequest("t");
        assertEquals("t", gar.getIdToken());

        RefreshTokenRequest rtr = new RefreshTokenRequest("t");
        assertEquals("t", rtr.getRefreshToken());

        ResetPasswordRequest rr = new ResetPasswordRequest("e", "o", "p");
        assertEquals("p", rr.getNewPassword());

        SendOtpRequest sor = new SendOtpRequest("9876543210");
        assertEquals("9876543210", sor.getMobileNumber());

        UserProfileResponse upr = new UserProfileResponse();
        upr.setId(1L);
        upr.setEmail("E");
        upr.setFullName("F");
        upr.setMobileNumber("M");
        upr.setIsActive(true);
        assertEquals("F", upr.getFullName());

        VerifyOtpRequest vor = new VerifyOtpRequest("E", "O");
        assertEquals("O", vor.getOtp());

        VerifyPhoneOtpRequest vpor = new VerifyPhoneOtpRequest("M", "O", "F");
        assertEquals("F", vpor.getFullName());
        vpor.setOtp("123");
        assertEquals("123", vpor.getOtp());

        AuthResponse res2 = new AuthResponse();
        res2.setTokenType("X");
        assertEquals("X", res2.getTokenType());
    }
}
