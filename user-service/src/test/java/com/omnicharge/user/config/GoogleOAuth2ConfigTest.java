package com.omnicharge.user.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GoogleOAuth2ConfigTest {

    @Test
    void googleIdTokenVerifier_ShouldBeCreated() {
        GoogleOAuth2Config config = new GoogleOAuth2Config();
        ReflectionTestUtils.setField(config, "googleClientId", "dummy-id");
        
        assertNotNull(config.googleIdTokenVerifier());
    }
}
