package com.omnicharge.user.config;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

class RedisConfigTest {

    @Test
    void redisTemplate_ShouldBeCreated() {
        RedisConfig config = new RedisConfig();
        RedisConnectionFactory factory = mock(RedisConnectionFactory.class);
        
        RedisTemplate<String, String> template = config.redisTemplate(factory);
        assertNotNull(template);
    }
}
