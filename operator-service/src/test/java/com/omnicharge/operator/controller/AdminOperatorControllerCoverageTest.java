package com.omnicharge.operator.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnicharge.operator.dto.OperatorRequest;
import com.omnicharge.operator.dto.OperatorResponse;
import com.omnicharge.operator.dto.PlanRequest;
import com.omnicharge.operator.dto.PlanResponse;
import com.omnicharge.operator.entity.OperatorCategory;
import com.omnicharge.operator.service.IOperatorService;
import com.omnicharge.operator.service.IPlanService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminOperatorController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminOperatorControllerCoverageTest {

    @MockitoBean
    private IOperatorService operatorService;
    @MockitoBean
    private IPlanService planService;
    @MockitoBean
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;
    @MockitoBean
    private org.springframework.data.jpa.mapping.JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getAllOperators_WithDifferentStatuses() throws Exception {
        when(operatorService.getOperatorsByStatus(any())).thenReturn(Collections.emptyList());

        // Test ACTIVE
        mockMvc.perform(get("/api/admin/operators").param("status", "ACTIVE"))
                .andExpect(status().isOk());
        // Test INACTIVE
        mockMvc.perform(get("/api/admin/operators").param("status", "INACTIVE"))
                .andExpect(status().isOk());
        // Test ALL
        mockMvc.perform(get("/api/admin/operators").param("status", "ALL"))
                .andExpect(status().isOk());
    }

    @Test
    void createAndLifecycleOperator() throws Exception {
        OperatorRequest req = new OperatorRequest("N", "C", OperatorCategory.PREPAID, "L");
        OperatorResponse res = OperatorResponse.builder().id(1L).build();
        
        when(operatorService.createOperator(any())).thenReturn(res);
        when(operatorService.updateOperator(anyLong(), any())).thenReturn(res);
        when(operatorService.activateOperator(anyLong())).thenReturn(res);
        when(operatorService.deactivateOperator(anyLong())).thenReturn(res);

        mockMvc.perform(post("/api/admin/operators")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(put("/api/admin/operators/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/admin/operators/1")).andExpect(status().isOk());
        mockMvc.perform(patch("/api/admin/operators/1/activate")).andExpect(status().isOk());
        mockMvc.perform(patch("/api/admin/operators/1/deactivate")).andExpect(status().isOk());
    }

    @Test
    void planManagement() throws Exception {
        PlanRequest req = new PlanRequest();
        req.setPlanName("P");
        req.setPrice(BigDecimal.TEN);
        req.setValidityDays(30);
        req.setDataLimit("1.5GB");
        req.setCategory(com.omnicharge.operator.entity.PlanCategory.UNLIMITED);
        PlanResponse res = PlanResponse.builder().id(10L).build();

        when(planService.createPlan(anyLong(), any())).thenReturn(res);
        when(planService.updatePlan(anyLong(), any())).thenReturn(res);
        when(planService.activatePlan(anyLong())).thenReturn(res);
        when(planService.deactivatePlan(anyLong())).thenReturn(res);

        mockMvc.perform(post("/api/admin/operators/1/plans")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(put("/api/admin/operators/plans/10")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/admin/operators/plans/10")).andExpect(status().isOk());
        mockMvc.perform(patch("/api/admin/operators/plans/10/activate")).andExpect(status().isOk());
        mockMvc.perform(patch("/api/admin/operators/plans/10/deactivate")).andExpect(status().isOk());
    }

    @Test
    void searchPlans_WithSort() throws Exception {
        when(planService.searchPlansWithStatus(any(), any(), any(), any())).thenReturn(org.springframework.data.domain.Page.empty());

        mockMvc.perform(get("/api/admin/operators/plans")
                .param("sortDir", "DESC")
                .param("sortBy", "name")
                .param("status", "ACTIVE"))
                .andExpect(status().isOk());
    }
}
