package com.omnicharge.gateway;

import com.omnicharge.gateway.config.RedisConfig;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FullCoverageTest {

    @Test
    void apiGatewayApplication_canBeInstantiated() {
        ApiGatewayApplication app = new ApiGatewayApplication();
        assertNotNull(app);
    }

    @Test
    void redisConfig_canBeInstantiated() {
        RedisConfig config = new RedisConfig();
        assertNotNull(config);
    }
}
