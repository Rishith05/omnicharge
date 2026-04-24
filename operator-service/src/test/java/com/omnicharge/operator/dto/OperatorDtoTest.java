package com.omnicharge.operator.dto;

import com.omnicharge.operator.entity.Operator;
import com.omnicharge.operator.entity.OperatorCategory;
import com.omnicharge.operator.entity.Plan;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;

class OperatorDtoTest {

    @Test
    void testOperatorModelBoilerplate() {
        Operator operator = new Operator();
        operator.setId(1L);
        operator.setName("Airtel");
        operator.setCode("AIR");
        operator.setCategory(OperatorCategory.PREPAID);
        operator.setLogoUrl("url");
        operator.setIsActive(true);
        operator.setPlans(new ArrayList<>());

        assertEquals(1L, operator.getId());
        assertEquals("Airtel", operator.getName());
        assertEquals("AIR", operator.getCode());
        assertEquals(OperatorCategory.PREPAID, operator.getCategory());
        assertEquals("url", operator.getLogoUrl());
        assertTrue(operator.getIsActive());
        assertNotNull(operator.getPlans());
    }

    @Test
    void testPlanModelBoilerplate() {
        Plan plan = new Plan();
        plan.setId(1L);
        plan.setOperator(new Operator());
        plan.setOperator(new Operator());
        plan.setPlanName("P");
        plan.setDataLimit("1.5GB/Day");
        plan.setPrice(BigDecimal.TEN);
        plan.setValidityDays(30);
        plan.setIsActive(true);
        plan.setDeactivatedByOperator(false);

        assertEquals(1L, plan.getId());
        assertNotNull(plan.getOperator());
        assertEquals("P", plan.getPlanName());
        assertEquals("1.5GB/Day", plan.getDataLimit());
        assertEquals(BigDecimal.TEN, plan.getPrice());
        assertEquals(30, plan.getValidityDays());
        assertTrue(plan.getIsActive());
        assertFalse(plan.getDeactivatedByOperator());
    }

    @Test
    void testRequestsResponses() {
        OperatorRequest req = new OperatorRequest("N", "C", OperatorCategory.POSTPAID, "L");
        assertEquals("N", req.getName());

        OperatorResponse res = OperatorResponse.builder()
                .id(1L)
                .name("N")
                .code("C")
                .category(OperatorCategory.PREPAID)
                .logoUrl("L")
                .isActive(true)
                .planCount(5)
                .build();
        
        assertEquals(1L, res.getId());
        assertEquals(5, res.getPlanCount());

        PlanResponse pres = PlanResponse.builder()
                .id(1L)
                .operatorId(2L)
                .operatorName("O")
                .planName("P")
                .dataLimit("1.5GB/Day")
                .price(BigDecimal.ONE)
                .validityDays(10)
                .isActive(true)
                .build();
        
        assertEquals("P", pres.getPlanName());
    }
}
