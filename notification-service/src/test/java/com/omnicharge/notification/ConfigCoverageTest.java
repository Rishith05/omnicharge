package com.omnicharge.notification;

import com.omnicharge.notification.config.RabbitMQConfig;
import com.omnicharge.notification.config.SecurityConfig;
import com.omnicharge.notification.config.GatewayAuthenticationFilter;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ConfigCoverageTest {

    // ═══════════════════════════════════════════════════════════
    // Application Main
    // ═══════════════════════════════════════════════════════════

    @Test
    void applicationCanBeInstantiated() {
        NotificationServiceApplication app = new NotificationServiceApplication();
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
    void rabbitMQ_rechargeQueue() {
        RabbitMQConfig config = new RabbitMQConfig();
        Queue queue = config.rechargeQueue();
        assertNotNull(queue);
        assertEquals("notification.recharge.queue", queue.getName());
    }

    @Test
    void rabbitMQ_paymentQueue() {
        RabbitMQConfig config = new RabbitMQConfig();
        Queue queue = config.paymentQueue();
        assertNotNull(queue);
        assertEquals("notification.payment.queue", queue.getName());
    }

    @Test
    void rabbitMQ_rechargeBinding() {
        RabbitMQConfig config = new RabbitMQConfig();
        Queue queue = config.rechargeQueue();
        TopicExchange exchange = config.exchange();
        Binding binding = config.rechargeBinding(queue, exchange);
        assertNotNull(binding);
        assertEquals("recharge.completed", binding.getRoutingKey());
    }

    @Test
    void rabbitMQ_paymentBinding() {
        RabbitMQConfig config = new RabbitMQConfig();
        Queue queue = config.paymentQueue();
        TopicExchange exchange = config.exchange();
        Binding binding = config.paymentBinding(queue, exchange);
        assertNotNull(binding);
        assertEquals("payment.completed", binding.getRoutingKey());
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
    // SmsService - covers disabled path (default AC_NONE)
    // ═══════════════════════════════════════════════════════════

    @Test
    void smsService_sendSms_disabledWhenNoCredentials() throws Exception {
        com.omnicharge.common.logging.LogEventPublisher logPub = mock(com.omnicharge.common.logging.LogEventPublisher.class);
        com.omnicharge.notification.service.SmsService smsService = new com.omnicharge.notification.service.SmsService(logPub);

        // Set accountSid to AC_NONE via reflection
        java.lang.reflect.Field sidField = com.omnicharge.notification.service.SmsService.class.getDeclaredField("accountSid");
        sidField.setAccessible(true);
        sidField.set(smsService, "AC_NONE");

        // Should not throw - disabled path returns early
        smsService.sendSms("9876543210", "Test message");
    }

    @Test
    void smsService_sendSms_nullAccountSid() throws Exception {
        com.omnicharge.common.logging.LogEventPublisher logPub = mock(com.omnicharge.common.logging.LogEventPublisher.class);
        com.omnicharge.notification.service.SmsService smsService = new com.omnicharge.notification.service.SmsService(logPub);

        java.lang.reflect.Field sidField = com.omnicharge.notification.service.SmsService.class.getDeclaredField("accountSid");
        sidField.setAccessible(true);
        sidField.set(smsService, null);

        // Should not throw
        smsService.sendSms("9876543210", "Test message");
    }

    @Test
    void smsService_init_disabledPath() throws Exception {
        com.omnicharge.common.logging.LogEventPublisher logPub = mock(com.omnicharge.common.logging.LogEventPublisher.class);
        com.omnicharge.notification.service.SmsService smsService = new com.omnicharge.notification.service.SmsService(logPub);

        java.lang.reflect.Field sidField = com.omnicharge.notification.service.SmsService.class.getDeclaredField("accountSid");
        sidField.setAccessible(true);
        sidField.set(smsService, "AC_NONE");

        // Should log warning and not throw
        smsService.init();
    }

    @Test
    void smsService_sendSms_nullMobile_withCredentials() throws Exception {
        com.omnicharge.common.logging.LogEventPublisher logPub = mock(com.omnicharge.common.logging.LogEventPublisher.class);
        com.omnicharge.notification.service.SmsService smsService = new com.omnicharge.notification.service.SmsService(logPub);

        java.lang.reflect.Field sidField = com.omnicharge.notification.service.SmsService.class.getDeclaredField("accountSid");
        sidField.setAccessible(true);
        sidField.set(smsService, "ACtest12345678901234567890123456");

        java.lang.reflect.Field tokenField = com.omnicharge.notification.service.SmsService.class.getDeclaredField("authToken");
        tokenField.setAccessible(true);
        tokenField.set(smsService, "test_token");

        java.lang.reflect.Field phoneField = com.omnicharge.notification.service.SmsService.class.getDeclaredField("fromNumber");
        phoneField.setAccessible(true);
        phoneField.set(smsService, "+10000000000");

        // Should hit null check then exception path, but not throw
        smsService.sendSms(null, "Test");
    }
}
