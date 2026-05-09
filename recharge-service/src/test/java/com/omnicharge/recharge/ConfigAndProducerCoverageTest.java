package com.omnicharge.recharge;

import com.omnicharge.recharge.config.GatewayAuthenticationFilter;
import com.omnicharge.recharge.config.RabbitMQConfig;
import com.omnicharge.recharge.config.RedisCacheConfig;
import com.omnicharge.recharge.config.SecurityConfig;
import com.omnicharge.recharge.messaging.RechargeEventProducer;
import com.omnicharge.common.event.RechargeCompletedEvent;
import com.omnicharge.common.event.saga.RechargeInitiatedEvent;
import com.omnicharge.common.logging.LogEventPublisher;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ConfigAndProducerCoverageTest {

    // ═══════════════════════════════════════════════════════════
    // Application Main
    // ═══════════════════════════════════════════════════════════

    @Test
    void applicationCanBeInstantiated() {
        RechargeServiceApplication app = new RechargeServiceApplication();
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
        TopicExchange exchange = config.exchange();
        assertNotNull(exchange);
        assertEquals("omnicharge.exchange", exchange.getName());
    }

    @Test
    void rabbitMQ_paymentApprovedQueue() {
        RabbitMQConfig config = new RabbitMQConfig();
        Queue queue = config.paymentApprovedQueue();
        assertNotNull(queue);
        assertEquals("saga.recharge.approved", queue.getName());
    }

    @Test
    void rabbitMQ_paymentRejectedQueue() {
        RabbitMQConfig config = new RabbitMQConfig();
        Queue queue = config.paymentRejectedQueue();
        assertNotNull(queue);
        assertEquals("saga.recharge.rejected", queue.getName());
    }

    @Test
    void rabbitMQ_paymentApprovedBinding() {
        RabbitMQConfig config = new RabbitMQConfig();
        Queue queue = config.paymentApprovedQueue();
        TopicExchange exchange = config.exchange();
        Binding binding = config.paymentApprovedBinding(queue, exchange);
        assertNotNull(binding);
        assertEquals("saga.payment.approved", binding.getRoutingKey());
    }

    @Test
    void rabbitMQ_paymentRejectedBinding() {
        RabbitMQConfig config = new RabbitMQConfig();
        Queue queue = config.paymentRejectedQueue();
        TopicExchange exchange = config.exchange();
        Binding binding = config.paymentRejectedBinding(queue, exchange);
        assertNotNull(binding);
        assertEquals("saga.payment.rejected", binding.getRoutingKey());
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
    // RedisCacheConfig
    // ═══════════════════════════════════════════════════════════

    @Test
    void redisCacheConfig_canBeInstantiated() {
        RedisCacheConfig config = new RedisCacheConfig();
        assertNotNull(config);
    }

    @Test
    void redisCacheConfig_cacheManager() {
        RedisCacheConfig config = new RedisCacheConfig();
        RedisConnectionFactory factory = mock(RedisConnectionFactory.class);
        var cacheManager = config.cacheManager(factory);
        assertNotNull(cacheManager);
    }

    // ═══════════════════════════════════════════════════════════
    // RechargeEventProducer - success & error paths
    // ═══════════════════════════════════════════════════════════

    @Test
    void rechargeEventProducer_publishCompleted_success() {
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        LogEventPublisher logEventPublisher = mock(LogEventPublisher.class);
        RechargeEventProducer producer = new RechargeEventProducer(rabbitTemplate, logEventPublisher);

        RechargeCompletedEvent event = RechargeCompletedEvent.builder()
                .rechargeId("R1").userId(1L).status("COMPLETED")
                .mobileNumber("9876543210").operatorName("Jio").planName("Unlimited")
                .amount(BigDecimal.TEN).transactionId("T1").build();
        producer.publishRechargeCompleted(event);

        verify(rabbitTemplate).convertAndSend(eq("omnicharge.exchange"), eq("recharge.completed"), any(Object.class));
        verify(logEventPublisher).publish(any(com.omnicharge.common.logging.LogEvent.class));
    }

    @Test
    void rechargeEventProducer_publishCompleted_exception() {
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        LogEventPublisher logEventPublisher = mock(LogEventPublisher.class);
        RechargeEventProducer producer = new RechargeEventProducer(rabbitTemplate, logEventPublisher);

        doThrow(new RuntimeException("Rabbit down")).when(rabbitTemplate).convertAndSend(anyString(), anyString(), any(Object.class));
        RechargeCompletedEvent event = RechargeCompletedEvent.builder()
                .rechargeId("R1").userId(1L).status("COMPLETED")
                .mobileNumber("9876543210").operatorName("Jio").planName("Unlimited")
                .amount(BigDecimal.TEN).transactionId("T1").build();
        producer.publishRechargeCompleted(event); // Should not throw
    }

    @Test
    void rechargeEventProducer_publishInitiated_success() {
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        LogEventPublisher logEventPublisher = mock(LogEventPublisher.class);
        RechargeEventProducer producer = new RechargeEventProducer(rabbitTemplate, logEventPublisher);

        RechargeInitiatedEvent event = RechargeInitiatedEvent.builder()
                .rechargeId("R1").userId(1L).amount(BigDecimal.TEN).paymentMethod("UPI").build();
        producer.publishRechargeInitiated(event);

        verify(rabbitTemplate).convertAndSend(eq("omnicharge.exchange"), eq("saga.recharge.initiated"), any(Object.class));
    }

    @Test
    void rechargeEventProducer_publishInitiated_exception() {
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        LogEventPublisher logEventPublisher = mock(LogEventPublisher.class);
        RechargeEventProducer producer = new RechargeEventProducer(rabbitTemplate, logEventPublisher);

        doThrow(new RuntimeException("fail")).when(rabbitTemplate).convertAndSend(anyString(), anyString(), any(Object.class));
        RechargeInitiatedEvent event = RechargeInitiatedEvent.builder()
                .rechargeId("R1").userId(1L).amount(BigDecimal.TEN).paymentMethod("UPI").build();
        producer.publishRechargeInitiated(event); // Should not throw
    }
}
