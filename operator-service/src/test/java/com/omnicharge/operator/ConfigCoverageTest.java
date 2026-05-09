package com.omnicharge.operator;

import com.omnicharge.operator.config.RabbitMQConfig;
import com.omnicharge.operator.config.RedisConfig;
import com.omnicharge.operator.config.SecurityConfig;
import com.omnicharge.operator.config.GatewayAuthenticationFilter;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ConfigCoverageTest {

    // ═══════════════════════════════════════════════════════════
    // Application Main
    // ═══════════════════════════════════════════════════════════

    @Test
    void applicationCanBeInstantiated() {
        OperatorServiceApplication app = new OperatorServiceApplication();
        assertNotNull(app);
    }

    // ═══════════════════════════════════════════════════════════
    // SecurityConfig
    // ═══════════════════════════════════════════════════════════

    @Test
    void securityConfig_canBeInstantiated() {
        GatewayAuthenticationFilter filter = new GatewayAuthenticationFilter();
        SecurityConfig config = new SecurityConfig(filter);
        assertNotNull(config);
    }

    // ═══════════════════════════════════════════════════════════
    // RabbitMQConfig - all beans
    // ═══════════════════════════════════════════════════════════

    @Test
    void rabbitMQ_exchange() {
        RabbitMQConfig config = new RabbitMQConfig();
        TopicExchange exchange = config.operatorExchange();
        assertNotNull(exchange);
        assertEquals("operator.exchange", exchange.getName());
    }

    @Test
    void rabbitMQ_planUpdateQueue() {
        RabbitMQConfig config = new RabbitMQConfig();
        Queue queue = config.planUpdateQueue();
        assertNotNull(queue);
        assertEquals("operator.plan.updates", queue.getName());
    }

    @Test
    void rabbitMQ_binding() {
        RabbitMQConfig config = new RabbitMQConfig();
        Queue queue = config.planUpdateQueue();
        TopicExchange exchange = config.operatorExchange();
        Binding binding = config.binding(queue, exchange);
        assertNotNull(binding);
        assertEquals("plan.updated", binding.getRoutingKey());
    }

    @Test
    void rabbitMQ_jsonMessageConverter() {
        RabbitMQConfig config = new RabbitMQConfig();
        var converter = config.jsonMessageConverter();
        assertNotNull(converter);
        assertThat(converter).isInstanceOf(Jackson2JsonMessageConverter.class);
    }

    @Test
    void rabbitMQ_rabbitTemplate() {
        RabbitMQConfig config = new RabbitMQConfig();
        ConnectionFactory factory = mock(ConnectionFactory.class);
        RabbitTemplate template = config.rabbitTemplate(factory);
        assertNotNull(template);
    }

    // ═══════════════════════════════════════════════════════════
    // RedisConfig - all beans
    // ═══════════════════════════════════════════════════════════

    @Test
    void redisConfig_redisTemplate() {
        RedisConfig config = new RedisConfig();
        RedisConnectionFactory factory = mock(RedisConnectionFactory.class);
        var template = config.redisTemplate(factory);
        assertNotNull(template);
    }

    @Test
    void redisConfig_objectMapper() {
        RedisConfig config = new RedisConfig();
        var mapper = config.objectMapper();
        assertNotNull(mapper);
    }

    // ═══════════════════════════════════════════════════════════
    // RestTemplateConfig
    // ═══════════════════════════════════════════════════════════

    @Test
    void restTemplateConfig_restTemplate() {
        com.omnicharge.operator.config.RestTemplateConfig config = new com.omnicharge.operator.config.RestTemplateConfig();
        var template = config.restTemplate();
        assertNotNull(template);
    }

    // ═══════════════════════════════════════════════════════════
    // RabbitMQConfig constants
    // ═══════════════════════════════════════════════════════════

    @Test
    void rabbitMQ_constants() {
        assertEquals("operator.exchange", RabbitMQConfig.EXCHANGE);
        assertEquals("operator.plan.updates", RabbitMQConfig.PLAN_UPDATE_QUEUE);
    }
}
