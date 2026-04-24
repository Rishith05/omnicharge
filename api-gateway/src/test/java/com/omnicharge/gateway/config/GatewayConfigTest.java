package com.omnicharge.gateway.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GatewayConfigTest {

    @Test
    void gatewayConfig_CanBeInstantiated() {
        GatewayConfig config = new GatewayConfig();
        assertNotNull(config);
    }
}
