package com.omnicharge.user;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import com.omnicharge.common.logging.LogEventPublisher;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.mail.javamail.JavaMailSender;

@SpringBootTest(properties = {
    "google.client-id=dummy-id",
    "google.client-secret=dummy-secret",
    "jwt.secret=9a6111f8e12c12513a0c5c7d8f3e2b34a6136111f8e12c12513a0c5c7d8f3e2b34",
    "jwt.access-token-expiration=3600000",
    "jwt.refresh-token-expiration=86400000",
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.hibernate.dialect.H2Dialect",
    "spring.data.redis.repositories.enabled=false"
})
class ApplicationTests {

	@MockitoBean
	private RedisConnectionFactory redisConnectionFactory;

	@MockitoBean(name = "redisTemplate")
	private RedisTemplate<String, String> redisTemplate;

	@MockitoBean
	private JavaMailSender javaMailSender;
	
	@MockitoBean
	private LogEventPublisher logEventPublisher;
	
	@MockitoBean
	private RabbitTemplate rabbitTemplate;

	@Test
	void contextLoads() {
	}

}
