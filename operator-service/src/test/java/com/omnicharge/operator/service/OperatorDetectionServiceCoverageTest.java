package com.omnicharge.operator.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnicharge.common.logging.LogEventPublisher;
import com.omnicharge.operator.client.NumverifyClient;
import com.omnicharge.operator.dto.NumverifyResponse;
import com.omnicharge.operator.dto.OperatorDetectionResponse;
import com.omnicharge.operator.dto.PlanResponse;
import com.omnicharge.operator.entity.Operator;
import com.omnicharge.operator.entity.OperatorCategory;
import com.omnicharge.operator.repository.OperatorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OperatorDetectionServiceCoverageTest {

    @Mock private NumverifyClient numverifyClient;
    @Mock private OperatorRepository operatorRepository;
    @Mock private IPlanService planService;
    @Mock private RedisTemplate<String, String> redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @Mock private ObjectMapper objectMapper;
    @Mock private LogEventPublisher logEventPublisher;

    @InjectMocks
    private OperatorDetectionService detectionService;

    private Operator jio;
    private Operator airtel;
    private Operator vi;
    private Operator bsnl;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        
        jio = createOperator(1L, "JIO", "Reliance Jio");
        airtel = createOperator(2L, "AIRTEL", "Bharti Airtel");
        vi = createOperator(3L, "VI", "Vodafone Idea");
        bsnl = createOperator(4L, "BSNL", "BSNL");
    }

    private Operator createOperator(Long id, String code, String name) {
        Operator op = new Operator();
        op.setId(id);
        op.setCode(code);
        op.setName(name);
        op.setIsActive(true);
        op.setCategory(OperatorCategory.PREPAID);
        return op;
    }

    @Test
    void detectOperator_CacheHit() throws JsonProcessingException {
        String mobile = "9876543210";
        OperatorDetectionResponse cachedResp = new OperatorDetectionResponse();
        cachedResp.setOperatorName("Cached Operator");
        
        when(valueOperations.get("operator:detect:" + mobile)).thenReturn("json_string");
        when(objectMapper.readValue("json_string", OperatorDetectionResponse.class)).thenReturn(cachedResp);

        OperatorDetectionResponse result = detectionService.detectOperator(mobile);
        
        assertEquals("Cached Operator", result.getOperatorName());
        verifyNoInteractions(numverifyClient);
    }

    @Test
    void detectOperator_CacheMiss_NumverifySuccess() throws JsonProcessingException {
        String mobile = "9876543210";
        when(valueOperations.get(anyString())).thenReturn(null);
        
        NumverifyResponse nv = new NumverifyResponse();
        nv.setValid(true);
        nv.setCarrier("Bharti Airtel");
        when(numverifyClient.detectOperator(mobile)).thenReturn(nv);
        
        when(operatorRepository.findByIsActive(true)).thenReturn(List.of(airtel, jio));
        when(planService.getPlansByOperator(anyLong())).thenReturn(new ArrayList<>());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        OperatorDetectionResponse result = detectionService.detectOperator(mobile);
        
        assertNotNull(result);
        assertEquals("AIRTEL", result.getOperatorCode());
        verify(valueOperations).set(eq("operator:detect:" + mobile), anyString(), anyLong(), eq(TimeUnit.HOURS));
    }

    @Test
    void detectOperator_DeserializationError_FallsThrough() throws JsonProcessingException {
        String mobile = "9876543210";
        when(valueOperations.get(anyString())).thenReturn("corrupt_json");
        when(objectMapper.readValue(anyString(), eq(OperatorDetectionResponse.class)))
            .thenThrow(mock(com.fasterxml.jackson.core.JsonParseException.class));
        
        detectionService.detectOperator(mobile);
        verify(numverifyClient).detectOperator(mobile);
    }

    @ParameterizedTest
    @ValueSource(strings = {"6200", "7001", "8002", "9999", "6300"})
    void detectByPrefix_JioMatch(String prefix) {
        String mobile = prefix + "123456";
        when(numverifyClient.detectOperator(anyString())).thenReturn(null);
        when(operatorRepository.findByCode("JIO")).thenReturn(Optional.of(jio));
        when(planService.getPlansByOperator(anyLong())).thenReturn(new ArrayList<>());

        OperatorDetectionResponse result = detectionService.detectOperator(mobile);
        assertEquals("JIO", result.getOperatorCode());
    }

    @ParameterizedTest
    @ValueSource(strings = {"9876", "9988", "9910", "9811", "9601", "9701", "9801", "9901"})
    void detectByPrefix_AirtelMatch(String prefix) {
        String mobile = prefix + "123456";
        when(numverifyClient.detectOperator(anyString())).thenReturn(null);
        when(operatorRepository.findByCode("AIRTEL")).thenReturn(Optional.of(airtel));
        when(planService.getPlansByOperator(anyLong())).thenReturn(new ArrayList<>());

        OperatorDetectionResponse result = detectionService.detectOperator(mobile);
        assertEquals("AIRTEL", result.getOperatorCode());
    }

    @ParameterizedTest
    @ValueSource(strings = {"9898", "9090", "8080", "9825", "9001"})
    void detectByPrefix_VIMatch(String prefix) {
        String mobile = prefix + "123456";
        when(numverifyClient.detectOperator(anyString())).thenReturn(null);
        when(operatorRepository.findByCode("VI")).thenReturn(Optional.of(vi));
        when(planService.getPlansByOperator(anyLong())).thenReturn(new ArrayList<>());

        OperatorDetectionResponse result = detectionService.detectOperator(mobile);
        assertEquals("VI", result.getOperatorCode());
    }

    @ParameterizedTest
    @ValueSource(strings = {"9449", "9448", "9400", "9441"})
    void detectByPrefix_BSNLMatch(String prefix) {
        String mobile = prefix + "123456";
        when(numverifyClient.detectOperator(anyString())).thenReturn(null);
        when(operatorRepository.findByCode("BSNL")).thenReturn(Optional.of(bsnl));
        when(planService.getPlansByOperator(anyLong())).thenReturn(new ArrayList<>());

        OperatorDetectionResponse result = detectionService.detectOperator(mobile);
        assertEquals("BSNL", result.getOperatorCode());
    }

    @Test
    void detectOperator_NotFound_LogsFailure() {
        when(numverifyClient.detectOperator(anyString())).thenReturn(null);
        // Prefix detection fails (empty repo)
        when(operatorRepository.findByIsActive(true)).thenReturn(Collections.emptyList());

        OperatorDetectionResponse result = detectionService.detectOperator("1111111111");
        
        assertNull(result);
        verify(logEventPublisher, atLeastOnce()).publish(any());
    }

    @Test
    void matchCarrierToOperator_FuzzyNameMatch() {
        when(numverifyClient.detectOperator(anyString())).thenReturn(null);
        when(operatorRepository.findByIsActive(true)).thenReturn(List.of(jio));
        when(planService.getPlansByOperator(anyLong())).thenReturn(new ArrayList<>());

        // Testing the deterministic fallback by using a number that hashes to jio's index
        // Since jio is index 0, any number whose hash % 1 == 0 will match.
        OperatorDetectionResponse result = detectionService.detectOperator("0000000000");
        assertNotNull(result);
    }
}
