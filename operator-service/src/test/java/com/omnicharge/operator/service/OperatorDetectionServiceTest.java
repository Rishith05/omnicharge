package com.omnicharge.operator.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnicharge.operator.client.NumverifyClient;
import com.omnicharge.operator.dto.NumverifyResponse;
import com.omnicharge.operator.dto.OperatorDetectionResponse;
import com.omnicharge.operator.entity.Operator;
import com.omnicharge.operator.repository.OperatorRepository;
import com.omnicharge.common.logging.LogEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OperatorDetectionServiceTest {

    @Mock
    private NumverifyClient numverifyClient;

    @Mock
    private OperatorRepository operatorRepository;

    @Mock
    private IPlanService planService;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private LogEventPublisher logEventPublisher;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private OperatorDetectionService detectionService;

    private Operator operator;
    private NumverifyResponse numverifyResponse;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        detectionService = new OperatorDetectionService(
            numverifyClient,
            operatorRepository,
            planService,
            redisTemplate,
            objectMapper,
            logEventPublisher
        );
        
        operator = new Operator();
        operator.setId(1L);
        operator.setName("Airtel");
        operator.setCode("AIRTEL");
        operator.setIsActive(true);

        numverifyResponse = new NumverifyResponse();
        numverifyResponse.setValid(true);
        numverifyResponse.setCarrier("Bharti Airtel Ltd");
    }

    @Test
    void detectOperator_CacheHit() throws Exception {
        String cacheKey = "operator:detect:9876543210";
        OperatorDetectionResponse cachedResponse = OperatorDetectionResponse.builder()
                .operatorCode("AIRTEL")
                .operatorName("Airtel")
                .build();

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(cacheKey)).thenReturn("{\"operatorCode\":\"AIRTEL\"}");
        when(objectMapper.readValue("{\"operatorCode\":\"AIRTEL\"}", OperatorDetectionResponse.class))
                .thenReturn(cachedResponse);

        OperatorDetectionResponse result = detectionService.detectOperator("9876543210");

        assertNotNull(result);
        assertEquals("AIRTEL", result.getOperatorCode());
        verify(numverifyClient, never()).detectOperator(anyString());
    }

    @Test
    void detectOperator_NumverifySuccess() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);
        when(numverifyClient.detectOperator("9876543210")).thenReturn(numverifyResponse);
        when(operatorRepository.findByIsActive(true)).thenReturn(List.of(operator));
        lenient().when(operatorRepository.findByCode("AIRTEL")).thenReturn(Optional.of(operator));
        lenient().when(planService.getPlansByOperator(1L)).thenReturn(Collections.emptyList());
        lenient().when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        OperatorDetectionResponse result = detectionService.detectOperator("9876543210");

        assertNotNull(result);
        assertEquals(1L, result.getOperatorId());
        assertEquals("Airtel", result.getOperatorName());
        verify(valueOperations, times(1)).set(eq("operator:detect:9876543210"), anyString(), eq(24L), eq(TimeUnit.HOURS));
    }

    @Test
    void detectOperator_FallbackJioPrefix() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);
        when(numverifyClient.detectOperator("8688123456")).thenReturn(null);
        
        Operator jioOperator = new Operator();
        jioOperator.setId(2L);
        jioOperator.setName("Jio");
        jioOperator.setCode("JIO");
        
        when(operatorRepository.findByCode("JIO")).thenReturn(Optional.of(jioOperator));
        when(planService.getPlansByOperator(2L)).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        OperatorDetectionResponse result = detectionService.detectOperator("8688123456");

        assertNotNull(result);
        assertEquals("Jio", result.getOperatorName());
    }

    @Test
    void detectOperator_FallbackDeterministicHash() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);
        when(numverifyClient.detectOperator("1111123456")).thenReturn(null);
        
        Operator jioOp = new Operator(); jioOp.setId(2L); jioOp.setName("Jio");
        Operator viOp = new Operator(); viOp.setId(3L); viOp.setName("Vi");
        List<Operator> activeOps = List.of(operator, jioOp, viOp);
        
        when(operatorRepository.findByIsActive(true)).thenReturn(activeOps);
        when(planService.getPlansByOperator(anyLong())).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        OperatorDetectionResponse result = detectionService.detectOperator("1111123456");

        assertNotNull(result);
        assertTrue(activeOps.stream().anyMatch(op -> op.getName().equals(result.getOperatorName())));
    }

    @Test
    void detectOperator_NullNumverifyResponse() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);
        when(numverifyClient.detectOperator("9876543210")).thenReturn(null);
        when(operatorRepository.findByCode("AIRTEL")).thenReturn(Optional.of(operator));
        when(planService.getPlansByOperator(1L)).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        OperatorDetectionResponse result = detectionService.detectOperator("9876543210");

        assertNotNull(result);
        assertEquals("Airtel", result.getOperatorName());
    }

    @Test
    void detectOperator_InvalidNumverifyResponse() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);
        NumverifyResponse res = new NumverifyResponse();
        res.setValid(false);
        when(numverifyClient.detectOperator("9876543210")).thenReturn(res);
        when(operatorRepository.findByCode("AIRTEL")).thenReturn(Optional.of(operator));
        when(planService.getPlansByOperator(1L)).thenReturn(Collections.emptyList());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        OperatorDetectionResponse result = detectionService.detectOperator("9876543210");

        assertNotNull(result);
        assertEquals("Airtel", result.getOperatorName());
    }

    @Test
    void detectOperator_MobileTooShort() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);
        when(numverifyClient.detectOperator("123")).thenReturn(null);

        OperatorDetectionResponse result = detectionService.detectOperator("123");

        assertNull(result);
    }
}

