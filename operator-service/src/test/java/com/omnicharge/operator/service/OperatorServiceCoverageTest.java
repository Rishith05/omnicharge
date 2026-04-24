package com.omnicharge.operator.service;

import com.omnicharge.common.exception.DuplicateResourceException;
import com.omnicharge.common.exception.ResourceNotFoundException;
import com.omnicharge.operator.dto.OperatorRequest;
import com.omnicharge.operator.dto.OperatorResponse;
import com.omnicharge.operator.entity.Operator;
import com.omnicharge.operator.entity.OperatorCategory;
import com.omnicharge.operator.entity.Plan;
import com.omnicharge.operator.repository.OperatorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OperatorServiceCoverageTest {

    @Mock
    private OperatorRepository operatorRepository;
    @Mock
    private RedisTemplate<String, String> redisTemplate;
    @Mock
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;

    private OperatorService operatorService;
    private Operator sampleOperator;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        operatorService = new OperatorService(
                operatorRepository,
                redisTemplate,
                logEventPublisher
        );

        sampleOperator = new Operator();
        sampleOperator.setId(1L);
        sampleOperator.setName("Airtel");
        sampleOperator.setCode("AIRTEL");
        sampleOperator.setCategory(OperatorCategory.PREPAID);
        sampleOperator.setIsActive(true);
        sampleOperator.setPlans(new ArrayList<>());
    }

    @Test
    void getOperatorById_NotFound_ThrowsException() {
        when(operatorRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> operatorService.getOperatorById(1L));
    }

    @Test
    void getActiveOperatorById_NotFound_ThrowsException() {
        when(operatorRepository.findActiveById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> operatorService.getActiveOperatorById(1L));
    }

    @Test
    void getOperatorsByStatus_Null_ReturnsAll() {
        when(operatorRepository.findAll()).thenReturn(List.of(sampleOperator));
        List<OperatorResponse> result = operatorService.getOperatorsByStatus(null);
        assertEquals(1, result.size());
    }

    @Test
    void createOperator_DuplicateCode_ThrowsException() {
        OperatorRequest request = new OperatorRequest("Airtel", "AIRTEL", OperatorCategory.PREPAID, "logo");
        when(operatorRepository.existsByCode("AIRTEL")).thenReturn(true);
        assertThrows(DuplicateResourceException.class, () -> operatorService.createOperator(request));
    }

    @Test
    void createOperator_DuplicateName_ThrowsException() {
        OperatorRequest request = new OperatorRequest("Airtel", "AIRTEL", OperatorCategory.PREPAID, "logo");
        when(operatorRepository.existsByCode("AIRTEL")).thenReturn(false);
        when(operatorRepository.existsByName("Airtel")).thenReturn(true);
        assertThrows(DuplicateResourceException.class, () -> operatorService.createOperator(request));
    }

    @Test
    void updateOperator_NotFound_ThrowsException() {
        OperatorRequest request = new OperatorRequest("Airtel", "AIRTEL", OperatorCategory.PREPAID, "logo");
        when(operatorRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> operatorService.updateOperator(1L, request));
    }

    @Test
    void updateOperator_DuplicateCodeFromAnother_ThrowsException() {
        OperatorRequest request = new OperatorRequest("New Name", "BUSY_CODE", OperatorCategory.PREPAID, "logo");
        Operator other = new Operator();
        other.setId(99L); // Different from 1L
        
        when(operatorRepository.findById(1L)).thenReturn(Optional.of(sampleOperator));
        when(operatorRepository.findByCode("BUSY_CODE")).thenReturn(Optional.of(other));
        
        assertThrows(DuplicateResourceException.class, () -> operatorService.updateOperator(1L, request));
    }

    @Test
    void deleteOperator_DeactivatesPlans() {
        Plan activePlan = new Plan();
        activePlan.setIsActive(true);
        sampleOperator.getPlans().add(activePlan);
        
        when(operatorRepository.findById(1L)).thenReturn(Optional.of(sampleOperator));
        
        operatorService.deleteOperator(1L);
        
        assertFalse(sampleOperator.getIsActive());
        assertFalse(activePlan.getIsActive());
        assertTrue(activePlan.getDeactivatedByOperator());
    }

    @Test
    void activateOperator_RestoresPlans() {
        Plan softDeactivated = new Plan();
        softDeactivated.setIsActive(false);
        softDeactivated.setDeactivatedByOperator(true);
        sampleOperator.getPlans().add(softDeactivated);
        sampleOperator.setIsActive(false);

        when(operatorRepository.findById(1L)).thenReturn(Optional.of(sampleOperator));
        when(operatorRepository.save(any())).thenReturn(sampleOperator);

        operatorService.activateOperator(1L);

        assertTrue(sampleOperator.getIsActive());
        assertTrue(softDeactivated.getIsActive());
        assertFalse(softDeactivated.getDeactivatedByOperator());
    }

    @Test
    void invalidateCache_RedisDown_DoesNotThrow() {
        when(operatorRepository.existsByCode(any())).thenReturn(false);
        when(operatorRepository.existsByName(any())).thenReturn(false);
        when(operatorRepository.save(any())).thenReturn(sampleOperator);
        
        // Mock redis to throw exception
        doThrow(new RuntimeException("Redis Down")).when(redisTemplate).delete(anyString());

        OperatorRequest request = new OperatorRequest("Name", "CODE", OperatorCategory.PREPAID, "logo");
        assertDoesNotThrow(() -> operatorService.createOperator(request));
    }

    @Test
    void mapToResponse_NullPlans_HandlesGracefully() {
        sampleOperator.setPlans(null);
        when(operatorRepository.findById(1L)).thenReturn(Optional.of(sampleOperator));
        OperatorResponse response = operatorService.getOperatorById(1L);
        assertEquals(0, response.getPlanCount());
    }
}
