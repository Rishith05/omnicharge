package com.omnicharge.recharge.controller;

import com.omnicharge.recharge.dto.ExpiringRechargeResponse;
import com.omnicharge.recharge.repository.RechargeRepository;
import com.omnicharge.recharge.service.IRechargeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InternalRechargeController.class)
@AutoConfigureMockMvc(addFilters = false)
class InternalRechargeControllerTest {
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IRechargeService rechargeService;

    @MockitoBean
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;

    @Test
    void getRechargeByIdInternal_Found() throws Exception {
        com.omnicharge.recharge.dto.RechargeResponse response = new com.omnicharge.recharge.dto.RechargeResponse();
        response.setRechargeId("OMNI-888");
        response.setOperatorName("Jio");
        response.setAmount(new BigDecimal("149.00"));

        when(rechargeService.getRechargeByIdInternal("OMNI-888")).thenReturn(response);

        mockMvc.perform(get("/api/internal/recharges/OMNI-888"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.operatorName").value("Jio"));
    }

    @Test
    void getRechargeByIdInternal_NotFound_ReturnsCustomError() throws Exception {
        when(rechargeService.getRechargeByIdInternal("UNKNOWN")).thenReturn(null);

        mockMvc.perform(get("/api/internal/recharges/UNKNOWN"))
                .andExpect(status().isOk()) // Internal returns HTTP 200 with error payload explicitly
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Recharge not found"));
    }

    @Test
    void getExpiringRecharges() throws Exception {
        ExpiringRechargeResponse response = ExpiringRechargeResponse.builder()
                .rechargeId("OMNI-EXPIRING1")
                .userId(1L)
                .userEmail("test@example.com")
                .mobileNumber("98765")
                .operatorName("Data")
                .planName("Weekly")
                .amount(new BigDecimal("100"))
                .expiryDate(LocalDate.now().plusDays(5))
                .build();

        when(rechargeService.getExpiringRecharges(anyInt())).thenReturn(Collections.singletonList(response));

        mockMvc.perform(get("/api/internal/recharges/expiring?daysLeft=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].rechargeId").value("OMNI-EXPIRING1"));
    }

    @Test
    void getExpiredToday() throws Exception {
        ExpiringRechargeResponse response = ExpiringRechargeResponse.builder()
                .rechargeId("OMNI-EXPIRED2")
                .build();

        when(rechargeService.getExpiredToday()).thenReturn(Collections.singletonList(response));

        mockMvc.perform(get("/api/internal/recharges/expired-today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].rechargeId").value("OMNI-EXPIRED2"));
    }

    @Test
    void markAsExpired() throws Exception {
        doNothing().when(rechargeService).markAsExpired("OMNI-EXPIRED2");

        mockMvc.perform(put("/api/internal/recharges/OMNI-EXPIRED2/expire"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Recharge marked as expired"));
                
        verify(rechargeService, times(1)).markAsExpired("OMNI-EXPIRED2");
    }
}
