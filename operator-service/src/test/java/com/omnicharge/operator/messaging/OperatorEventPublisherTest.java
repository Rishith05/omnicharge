package com.omnicharge.operator.messaging;

import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class OperatorEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Test
    void publishPlanUpdatedEvent_Success() {
        MockitoAnnotations.openMocks(this);
        OperatorEventPublisher publisher = new OperatorEventPublisher(rabbitTemplate);
        
        publisher.publishPlanUpdatedEvent(1L);
        
        verify(rabbitTemplate).convertAndSend(eq(com.omnicharge.operator.config.RabbitMQConfig.EXCHANGE), eq("plan.updated"), (Object) any());
    }

    @Test
    void publishPlanUpdatedEvent_Exception() {
        MockitoAnnotations.openMocks(this);
        OperatorEventPublisher publisher = new OperatorEventPublisher(rabbitTemplate);
        
        doThrow(new RuntimeException("Rabbit error")).when(rabbitTemplate).convertAndSend(anyString(), anyString(), (Object) any());
        
        publisher.publishPlanUpdatedEvent(1L);
        // Should not throw, just log
        verify(rabbitTemplate).convertAndSend(anyString(), eq("plan.updated"), (Object) any());
    }
}
