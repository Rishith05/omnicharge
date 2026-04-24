package com.omnicharge.operator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnicharge.operator.entity.Operator;
import com.omnicharge.operator.entity.Plan;
import com.omnicharge.operator.repository.PlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import java.util.List;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class SystemCacheServiceTest {

    private SystemCacheService service;

    @Mock
    private PlanRepository planRepository;
    @Mock
    private RedisTemplate<String, String> redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        service = new SystemCacheService(planRepository, redisTemplate, objectMapper);
    }

    @Test
    void handleApplicationReady_AlreadyInit() {
        when(redisTemplate.hasKey(anyString())).thenReturn(true);
        service.handleApplicationReady();
        verify(planRepository, never()).findAll();
    }

    @Test
    void handleApplicationReady_ColdStart() {
        when(redisTemplate.hasKey(anyString())).thenReturn(false);
        Operator op = new Operator(); op.setId(1L); op.setName("O");
        Plan p = new Plan(); p.setId(1L); p.setIsActive(true); p.setOperator(op);
        when(planRepository.findAll()).thenReturn(List.of(p));
        
        service.handleApplicationReady();
        
        verify(planRepository).findAll();
        verify(valueOperations, atLeastOnce()).set(eq("system:cache:initialized"), anyString(), any());
    }

    @Test
    void rebuildRedisCache_Exception() throws Exception {
        Operator op = new Operator(); op.setId(1L); op.setName("O");
        Plan p = new Plan(); p.setId(1L); p.setIsActive(true); p.setOperator(op);
        when(planRepository.findAll()).thenReturn(List.of(p));
        when(objectMapper.writeValueAsString(any())).thenThrow(new RuntimeException("JSON error"));
        
        service.rebuildRedisCache();
        // Should not crash due to catch block
        verify(planRepository).findAll();
    }
}
