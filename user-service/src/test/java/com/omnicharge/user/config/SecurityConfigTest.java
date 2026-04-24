package com.omnicharge.user.config;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

class SecurityConfigTest {

    @Test
    void passwordEncoder_ShouldBeCreated() {
        SecurityConfig config = new SecurityConfig(mock(com.omnicharge.user.filter.GatewayAuthenticationFilter.class));
        assertNotNull(config.passwordEncoder());
    }
}
