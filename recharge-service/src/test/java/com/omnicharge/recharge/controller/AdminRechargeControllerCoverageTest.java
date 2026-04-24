package com.omnicharge.recharge.controller;

import com.omnicharge.recharge.dto.RechargeStatsResponse;
import com.omnicharge.recharge.service.IRechargeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminRechargeController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminRechargeControllerCoverageTest {

    @MockitoBean
    private IRechargeService rechargeService;
    @MockitoBean
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;
    @MockitoBean
    private org.springframework.data.jpa.mapping.JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getAllRecharges_WithSorting() throws Exception {
        when(rechargeService.getAllRecharges(any())).thenReturn(org.springframework.data.domain.Page.empty());

        mockMvc.perform(get("/api/admin/recharges")
                .param("sortDir", "ASC")
                .param("sortBy", "amount"))
                .andExpect(status().isOk());
    }

    @Test
    void getRechargeStats() throws Exception {
        RechargeStatsResponse stats = RechargeStatsResponse.builder()
                .totalRecharges(100L)
                .build();
        when(rechargeService.getRechargeStats()).thenReturn(stats);

        mockMvc.perform(get("/api/admin/recharges/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRecharges").value(100));
    }
}
