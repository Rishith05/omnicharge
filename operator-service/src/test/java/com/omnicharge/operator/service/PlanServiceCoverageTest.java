package com.omnicharge.operator.service;

import com.omnicharge.common.exception.ResourceNotFoundException;
import com.omnicharge.common.logging.LogEventPublisher;
import com.omnicharge.operator.dto.PlanRequest;
import com.omnicharge.operator.entity.Operator;
import com.omnicharge.operator.entity.Plan;
import com.omnicharge.operator.entity.PlanCategory;
import com.omnicharge.operator.messaging.OperatorEventPublisher;
import com.omnicharge.operator.repository.OperatorRepository;
import com.omnicharge.operator.repository.PlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PlanServiceCoverageTest {

    private PlanService service;

    @Mock
    private PlanRepository planRepository;
    @Mock
    private OperatorRepository operatorRepository;
    @Mock
    private OperatorEventPublisher operatorEventPublisher;
    @Mock
    private LogEventPublisher logEventPublisher;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new PlanService(planRepository, operatorRepository, operatorEventPublisher, logEventPublisher);
    }

    @Test
    void getPlanById_NotFound() {
        when(planRepository.findActiveById(anyLong())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.getPlanById(1L));
    }

    @Test
    void createPlan_OperatorNotFound() {
        when(operatorRepository.findById(anyLong())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.createPlan(1L, new PlanRequest()));
    }

    @Test
    void updatePlan_NotFound() {
        when(planRepository.findById(anyLong())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.updatePlan(1L, new PlanRequest()));
    }

    @Test
    void deletePlan_NotFound() {
        when(planRepository.findById(anyLong())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.deletePlan(1L));
    }

    @Test
    void activatePlan_OperatorInactive() {
        Operator op = new Operator(); op.setIsActive(false);
        Plan p = new Plan(); p.setOperator(op);
        when(planRepository.findById(anyLong())).thenReturn(Optional.of(p));
        assertThrows(IllegalStateException.class, () -> service.activatePlan(1L));
    }

    @Test
    void deactivatePlan_Success() {
        Operator op = new Operator(); op.setId(1L); op.setName("O");
        Plan p = new Plan(); p.setId(1L); p.setOperator(op); p.setPlanName("P"); p.setCategory(PlanCategory.DATA);
        when(planRepository.findById(anyLong())).thenReturn(Optional.of(p));
        when(planRepository.save(any())).thenReturn(p);
        
        service.deactivatePlan(1L);
        assertFalse(p.getIsActive());
    }
}
