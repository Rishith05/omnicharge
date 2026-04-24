package com.omnicharge.operator.dto;

import com.omnicharge.operator.entity.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.ArrayList;
import static org.junit.jupiter.api.Assertions.*;

class DataModelCoverageTest {

    @Test
    void testOperatorModel() {
        Operator o = new Operator();
        o.setId(1L);
        o.setName("N");
        o.setCode("C");
        o.setCategory(OperatorCategory.PREPAID);
        o.setLogoUrl("L");
        o.setIsActive(true);
        o.setPlans(new ArrayList<>());
        
        assertEquals(1L, o.getId());
        assertEquals("N", o.getName());
        assertEquals("C", o.getCode());
        assertEquals(OperatorCategory.PREPAID, o.getCategory());
        assertEquals("L", o.getLogoUrl());
        assertTrue(o.getIsActive());
        assertNotNull(o.getPlans());
    }

    @Test
    void testPlanModel() {
        Plan p = new Plan();
        p.setId(1L);
        p.setPlanName("P");
        p.setPrice(BigDecimal.TEN);
        p.setValidityDays(30);
        p.setDataLimit("D");
        p.setCallBenefit("C");
        p.setSmsBenefit("S");
        p.setAdditionalBenefits("A");
        p.setCategory(PlanCategory.UNLIMITED);
        p.setIsActive(true);
        p.setDeactivatedByOperator(false);
        p.setOperator(new Operator());
        
        assertEquals(1L, p.getId());
        assertEquals("P", p.getPlanName());
        assertEquals(BigDecimal.TEN, p.getPrice());
        assertEquals(30, p.getValidityDays());
        assertEquals("D", p.getDataLimit());
        assertEquals("C", p.getCallBenefit());
        assertEquals("S", p.getSmsBenefit());
        assertEquals("A", p.getAdditionalBenefits());
        assertEquals(PlanCategory.UNLIMITED, p.getCategory());
        assertTrue(p.getIsActive());
        assertFalse(p.getDeactivatedByOperator());
        assertNotNull(p.getOperator());
    }

    @Test
    void testDtos() {
        OperatorRequest or = new OperatorRequest("N", "C", OperatorCategory.PREPAID, "L");
        assertEquals("N", or.getName());
        or.setName("N2");
        assertEquals("N2", or.getName());

        OperatorResponse res = OperatorResponse.builder()
                .id(1L).name("N").code("C").category(OperatorCategory.PREPAID).logoUrl("L").isActive(true).planCount(5)
                .build();
        assertEquals(1L, res.getId());
        assertEquals(5, res.getPlanCount());

        PlanRequest pr = new PlanRequest();
        pr.setPlanName("P");
        pr.setPrice(BigDecimal.ONE);
        pr.setValidityDays(10);
        pr.setDataLimit("D");
        pr.setCallBenefit("C");
        pr.setSmsBenefit("S");
        pr.setAdditionalBenefits("A");
        pr.setCategory(PlanCategory.TALKTIME);
        assertEquals("P", pr.getPlanName());

        PlanResponse pres = PlanResponse.builder()
                .id(1L).operatorId(2L).operatorName("O").planName("P").price(BigDecimal.ONE).validityDays(1)
                .dataLimit("D").callBenefit("C").smsBenefit("S").additionalBenefits("A").category(PlanCategory.DATA).isActive(true)
                .build();
        assertEquals("O", pres.getOperatorName());
    }
}
