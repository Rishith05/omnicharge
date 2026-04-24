package com.omnicharge.operator;

import com.omnicharge.operator.config.GatewayAuthenticationFilter;
import com.omnicharge.operator.config.OpenApiConfig;
import com.omnicharge.operator.config.RabbitMQConfig;
import com.omnicharge.operator.config.DataSeeder;
import com.omnicharge.operator.controller.AdminOperatorController;
import com.omnicharge.operator.controller.AdminSystemController;
import com.omnicharge.operator.dto.*;
import com.omnicharge.operator.entity.*;
import com.omnicharge.operator.event.PlanUpdatedMessage;
import com.omnicharge.operator.service.IOperatorService;
import com.omnicharge.operator.service.IPlanService;
import com.omnicharge.operator.service.IOperatorDetectionService;
import com.omnicharge.operator.service.SystemCacheService;
import com.omnicharge.operator.repository.OperatorRepository;
import com.omnicharge.operator.repository.PlanRepository;
import com.omnicharge.common.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.servlet.FilterChain;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FullCoverageTest {

    // ═══════════════════════════════════════════════════════════
    // OpenApiConfig
    // ═══════════════════════════════════════════════════════════

    @Test
    void openApiConfig_canBeInstantiated() {
        OpenApiConfig config = new OpenApiConfig();
        assertNotNull(config);
    }

    // ═══════════════════════════════════════════════════════════
    // OperatorServiceApplication
    // ═══════════════════════════════════════════════════════════

    @Test
    void operatorServiceApplication_canBeInstantiated() {
        OperatorServiceApplication app = new OperatorServiceApplication();
        assertNotNull(app);
    }

    // ═══════════════════════════════════════════════════════════
    // GatewayAuthenticationFilter
    // ═══════════════════════════════════════════════════════════

    @Test
    void gatewayFilter_withHeaders_setsAuthentication() throws Exception {
        GatewayAuthenticationFilter filter = new GatewayAuthenticationFilter();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Id", "1");
        request.addHeader("X-User-Role", "ROLE_USER");
        request.addHeader("X-User-Email", "test@test.com");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request, response);
        SecurityContextHolder.clearContext();
    }

    @Test
    void gatewayFilter_withoutHeaders_noAuth() throws Exception {
        GatewayAuthenticationFilter filter = new GatewayAuthenticationFilter();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        SecurityContextHolder.clearContext();
        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request, response);
    }

    @Test
    void gatewayFilter_onlyRole_noAuth() throws Exception {
        GatewayAuthenticationFilter filter = new GatewayAuthenticationFilter();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Role", "ROLE_USER");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        SecurityContextHolder.clearContext();
        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request, response);
    }

    // ═══════════════════════════════════════════════════════════
    // RabbitMQConfig
    // ═══════════════════════════════════════════════════════════

    @Test
    void rabbitMQConfig_exchange() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.operatorExchange());
        assertEquals("operator.exchange", config.operatorExchange().getName());
    }

    @Test
    void rabbitMQConfig_queue() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.planUpdateQueue());
        assertEquals("operator.plan.updates", config.planUpdateQueue().getName());
    }

    @Test
    void rabbitMQConfig_binding() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.binding(config.planUpdateQueue(), config.operatorExchange()));
    }

    @Test
    void rabbitMQConfig_jsonMessageConverter() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.jsonMessageConverter());
    }

    @Test
    void rabbitMQConfig_constants() {
        assertEquals("operator.exchange", RabbitMQConfig.EXCHANGE);
        assertEquals("operator.plan.updates", RabbitMQConfig.PLAN_UPDATE_QUEUE);
    }

    // ═══════════════════════════════════════════════════════════
    // DataSeeder
    // ═══════════════════════════════════════════════════════════

    @Test
    void dataSeeder_alreadySeeded_skips() throws Exception {
        OperatorRepository operatorRepo = mock(OperatorRepository.class);
        PlanRepository planRepo = mock(PlanRepository.class);
        when(operatorRepo.count()).thenReturn(5L);
        when(planRepo.count()).thenReturn(10L);

        DataSeeder seeder = new DataSeeder(operatorRepo, planRepo);
        seeder.run();

        verify(operatorRepo, never()).saveAll(any());
        verify(planRepo, never()).saveAll(any());
    }

    @Test
    void dataSeeder_emptyDb_seedsData() throws Exception {
        OperatorRepository operatorRepo = mock(OperatorRepository.class);
        PlanRepository planRepo = mock(PlanRepository.class);
        when(operatorRepo.count()).thenReturn(0L);
        when(planRepo.count()).thenReturn(0L);
        when(operatorRepo.findByCode("AIRTEL")).thenReturn(Optional.of(createTestOperator("Airtel")));
        when(operatorRepo.findByCode("JIO")).thenReturn(Optional.of(createTestOperator("Jio")));
        when(operatorRepo.findByCode("VI")).thenReturn(Optional.of(createTestOperator("Vi")));
        when(operatorRepo.saveAll(any())).thenReturn(List.of());
        when(planRepo.saveAll(any())).thenReturn(List.of());

        DataSeeder seeder = new DataSeeder(operatorRepo, planRepo);
        seeder.run();

        verify(operatorRepo).saveAll(any());
        verify(planRepo, atLeastOnce()).saveAll(any());
    }

    @Test
    void dataSeeder_noOperatorsFound_skipsPlans() throws Exception {
        OperatorRepository operatorRepo = mock(OperatorRepository.class);
        PlanRepository planRepo = mock(PlanRepository.class);
        when(operatorRepo.count()).thenReturn(0L);
        when(planRepo.count()).thenReturn(0L);
        when(operatorRepo.findByCode(anyString())).thenReturn(Optional.empty());
        when(operatorRepo.saveAll(any())).thenReturn(List.of());

        DataSeeder seeder = new DataSeeder(operatorRepo, planRepo);
        seeder.run();

        verify(operatorRepo).saveAll(any());
        verify(planRepo, never()).saveAll(any());
    }

    // ═══════════════════════════════════════════════════════════
    // Operator Entity
    // ═══════════════════════════════════════════════════════════

    @Test
    void operator_gettersSetters() {
        Operator op = new Operator();
        op.setId(1L);
        op.setName("Jio");
        op.setCode("JIO");
        op.setCategory(OperatorCategory.PREPAID);
        op.setLogoUrl("https://example.com/jio.png");
        op.setIsActive(true);
        op.setPlans(new ArrayList<>());

        assertEquals(1L, op.getId());
        assertEquals("Jio", op.getName());
        assertEquals("JIO", op.getCode());
        assertEquals(OperatorCategory.PREPAID, op.getCategory());
        assertEquals("https://example.com/jio.png", op.getLogoUrl());
        assertTrue(op.getIsActive());
        assertNotNull(op.getPlans());
        assertEquals(0, op.getPlans().size());
    }

    @Test
    void operator_defaultValues() {
        Operator op = new Operator();
        assertTrue(op.getIsActive());
        assertNotNull(op.getPlans());
    }

    // ═══════════════════════════════════════════════════════════
    // Plan Entity
    // ═══════════════════════════════════════════════════════════

    @Test
    void plan_gettersSetters() {
        Operator op = createTestOperator("Jio");
        Plan plan = new Plan();
        plan.setId(1L);
        plan.setOperator(op);
        plan.setPlanName("Unlimited");
        plan.setPrice(BigDecimal.valueOf(299));
        plan.setValidityDays(28);
        plan.setDataLimit("2GB/day");
        plan.setCallBenefit("Unlimited");
        plan.setSmsBenefit("100/day");
        plan.setAdditionalBenefits("JioTV");
        plan.setCategory(PlanCategory.RECOMMENDED);
        plan.setIsActive(true);
        plan.setDeactivatedByOperator(false);

        assertEquals(1L, plan.getId());
        assertEquals(op, plan.getOperator());
        assertEquals("Unlimited", plan.getPlanName());
        assertEquals(BigDecimal.valueOf(299), plan.getPrice());
        assertEquals(28, plan.getValidityDays());
        assertEquals("2GB/day", plan.getDataLimit());
        assertEquals("Unlimited", plan.getCallBenefit());
        assertEquals("100/day", plan.getSmsBenefit());
        assertEquals("JioTV", plan.getAdditionalBenefits());
        assertEquals(PlanCategory.RECOMMENDED, plan.getCategory());
        assertTrue(plan.getIsActive());
        assertFalse(plan.getDeactivatedByOperator());
    }

    @Test
    void plan_defaultValues() {
        Plan plan = new Plan();
        assertTrue(plan.getIsActive());
        assertFalse(plan.getDeactivatedByOperator());
    }

    // ═══════════════════════════════════════════════════════════
    // Enums
    // ═══════════════════════════════════════════════════════════

    @ParameterizedTest
    @EnumSource(OperatorCategory.class)
    void operatorCategory_allValues(OperatorCategory cat) {
        assertNotNull(cat);
        assertNotNull(cat.name());
    }

    @Test
    void operatorCategory_valueOf() {
        assertEquals(OperatorCategory.PREPAID, OperatorCategory.valueOf("PREPAID"));
        assertEquals(OperatorCategory.POSTPAID, OperatorCategory.valueOf("POSTPAID"));
        assertEquals(OperatorCategory.DTH, OperatorCategory.valueOf("DTH"));
        assertEquals(OperatorCategory.ELECTRICITY, OperatorCategory.valueOf("ELECTRICITY"));
        assertEquals(OperatorCategory.GAS, OperatorCategory.valueOf("GAS"));
        assertEquals(OperatorCategory.WATER, OperatorCategory.valueOf("WATER"));
    }

    @ParameterizedTest
    @EnumSource(PlanCategory.class)
    void planCategory_allValues(PlanCategory cat) {
        assertNotNull(cat);
    }

    @Test
    void planCategory_valueOf() {
        assertEquals(PlanCategory.RECOMMENDED, PlanCategory.valueOf("RECOMMENDED"));
        assertEquals(PlanCategory.DATA, PlanCategory.valueOf("DATA"));
        assertEquals(PlanCategory.UNLIMITED, PlanCategory.valueOf("UNLIMITED"));
        assertEquals(PlanCategory.TALKTIME, PlanCategory.valueOf("TALKTIME"));
    }

    // ═══════════════════════════════════════════════════════════
    // DTOs
    // ═══════════════════════════════════════════════════════════

    @Test
    void operatorRequest_gettersSetters() {
        OperatorRequest req = new OperatorRequest();
        req.setName("Airtel");
        req.setCode("AIRTEL");
        req.setCategory(OperatorCategory.PREPAID);
        req.setLogoUrl("https://example.com/airtel.png");

        assertEquals("Airtel", req.getName());
        assertEquals("AIRTEL", req.getCode());
        assertEquals(OperatorCategory.PREPAID, req.getCategory());
        assertEquals("https://example.com/airtel.png", req.getLogoUrl());
    }

    @Test
    void operatorRequest_allArgs() {
        OperatorRequest req = new OperatorRequest("Jio", "JIO", OperatorCategory.PREPAID, "url");
        assertEquals("Jio", req.getName());
    }

    @Test
    void planRequest_gettersSetters() {
        PlanRequest req = new PlanRequest();
        req.setPlanName("Unlimited");
        req.setPrice(BigDecimal.valueOf(299));
        req.setValidityDays(28);
        req.setDataLimit("2GB/day");
        req.setCallBenefit("Unlimited");
        req.setSmsBenefit("100/day");
        req.setAdditionalBenefits("JioTV");
        req.setCategory(PlanCategory.RECOMMENDED);

        assertEquals("Unlimited", req.getPlanName());
        assertEquals(BigDecimal.valueOf(299), req.getPrice());
        assertEquals(28, req.getValidityDays());
        assertEquals("2GB/day", req.getDataLimit());
        assertEquals("Unlimited", req.getCallBenefit());
        assertEquals("100/day", req.getSmsBenefit());
        assertEquals("JioTV", req.getAdditionalBenefits());
        assertEquals(PlanCategory.RECOMMENDED, req.getCategory());
    }

    @Test
    void operatorResponse_builder() {
        OperatorResponse res = OperatorResponse.builder()
                .id(1L)
                .name("Jio")
                .code("JIO")
                .category(OperatorCategory.PREPAID)
                .logoUrl("url")
                .isActive(true)
                .planCount(5)
                .build();

        assertEquals(1L, res.getId());
        assertEquals("Jio", res.getName());
        assertEquals("JIO", res.getCode());
        assertEquals(OperatorCategory.PREPAID, res.getCategory());
        assertEquals("url", res.getLogoUrl());
        assertTrue(res.getIsActive());
        assertEquals(5, res.getPlanCount());
    }

    @Test
    void planResponse_builder() {
        PlanResponse res = PlanResponse.builder()
                .id(1L)
                .operatorId(10L)
                .operatorName("Jio")
                .planName("Unlimited")
                .price(BigDecimal.valueOf(299))
                .validityDays(28)
                .dataLimit("2GB/day")
                .callBenefit("Unlimited")
                .smsBenefit("100/day")
                .additionalBenefits("JioTV")
                .category(PlanCategory.RECOMMENDED)
                .isActive(true)
                .build();

        assertEquals(1L, res.getId());
        assertEquals(10L, res.getOperatorId());
        assertEquals("Jio", res.getOperatorName());
        assertEquals("Unlimited", res.getPlanName());
    }

    // ═══════════════════════════════════════════════════════════
    // PlanUpdatedMessage
    // ═══════════════════════════════════════════════════════════

    @Test
    void planUpdatedMessage_gettersSetters() {
        PlanUpdatedMessage msg = new PlanUpdatedMessage();
        msg.setOperatorId(1L);
        msg.setEventId("evt-123");
        msg.setTimestamp(System.currentTimeMillis());
        assertEquals(1L, msg.getOperatorId());
        assertEquals("evt-123", msg.getEventId());
        assertNotNull(msg.getTimestamp());
    }

    @Test
    void planUpdatedMessage_builder() {
        PlanUpdatedMessage msg = PlanUpdatedMessage.builder()
                .eventId("evt-1")
                .operatorId(1L)
                .timestamp(123456789L)
                .build();
        assertEquals("evt-1", msg.getEventId());
        assertEquals(1L, msg.getOperatorId());
        assertEquals(123456789L, msg.getTimestamp());
    }

    @Test
    void planUpdatedMessage_toString() {
        PlanUpdatedMessage msg = PlanUpdatedMessage.builder().eventId("e1").operatorId(1L).build();
        assertNotNull(msg.toString());
        assertThat(msg.toString()).contains("e1");
    }

    // ═══════════════════════════════════════════════════════════
    // AdminOperatorController
    // ═══════════════════════════════════════════════════════════

    @Test
    void adminOperatorController_getAllOperators_noStatus() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        when(operatorService.getOperatorsByStatus(null)).thenReturn(List.of());

        ResponseEntity<ApiResponse<List<OperatorResponse>>> result = controller.getAllOperators(null);
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_getAllOperators_active() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        when(operatorService.getOperatorsByStatus(true)).thenReturn(List.of());

        ResponseEntity<ApiResponse<List<OperatorResponse>>> result = controller.getAllOperators("ACTIVE");
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_getAllOperators_inactive() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        when(operatorService.getOperatorsByStatus(false)).thenReturn(List.of());

        ResponseEntity<ApiResponse<List<OperatorResponse>>> result = controller.getAllOperators("INACTIVE");
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_getAllOperators_all() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        when(operatorService.getOperatorsByStatus(null)).thenReturn(List.of());

        ResponseEntity<ApiResponse<List<OperatorResponse>>> result = controller.getAllOperators("ALL");
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_createOperator() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        OperatorRequest req = new OperatorRequest("Jio", "JIO", OperatorCategory.PREPAID, null);
        OperatorResponse res = OperatorResponse.builder().id(1L).name("Jio").build();
        when(operatorService.createOperator(req)).thenReturn(res);

        ResponseEntity<ApiResponse<OperatorResponse>> result = controller.createOperator(req);
        assertEquals(201, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_updateOperator() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        OperatorRequest req = new OperatorRequest("Jio", "JIO", OperatorCategory.PREPAID, null);
        OperatorResponse res = OperatorResponse.builder().id(1L).name("Jio").build();
        when(operatorService.updateOperator(1L, req)).thenReturn(res);

        ResponseEntity<ApiResponse<OperatorResponse>> result = controller.updateOperator(1L, req);
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_deleteOperator() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);

        ResponseEntity<ApiResponse<Void>> result = controller.deleteOperator(1L);
        assertEquals(200, result.getStatusCode().value());
        verify(operatorService).deleteOperator(1L);
    }

    @Test
    void adminOperatorController_activateOperator() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        OperatorResponse res = OperatorResponse.builder().id(1L).isActive(true).build();
        when(operatorService.activateOperator(1L)).thenReturn(res);

        ResponseEntity<ApiResponse<OperatorResponse>> result = controller.activateOperator(1L);
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_deactivateOperator() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        OperatorResponse res = OperatorResponse.builder().id(1L).isActive(false).build();
        when(operatorService.deactivateOperator(1L)).thenReturn(res);

        ResponseEntity<ApiResponse<OperatorResponse>> result = controller.deactivateOperator(1L);
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_getOperatorPlans() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        when(planService.getPlansByOperatorAndStatus(1L, null)).thenReturn(List.of());

        ResponseEntity<ApiResponse<List<PlanResponse>>> result = controller.getOperatorPlans(1L, null);
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_createPlan() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        PlanRequest req = new PlanRequest();
        PlanResponse res = PlanResponse.builder().id(1L).build();
        when(planService.createPlan(1L, req)).thenReturn(res);

        ResponseEntity<ApiResponse<PlanResponse>> result = controller.createPlan(1L, req);
        assertEquals(201, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_updatePlan() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        PlanRequest req = new PlanRequest();
        PlanResponse res = PlanResponse.builder().id(1L).build();
        when(planService.updatePlan(1L, req)).thenReturn(res);

        ResponseEntity<ApiResponse<PlanResponse>> result = controller.updatePlan(1L, req);
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_deletePlan() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);

        ResponseEntity<ApiResponse<Void>> result = controller.deletePlan(1L);
        assertEquals(200, result.getStatusCode().value());
        verify(planService).deletePlan(1L);
    }

    @Test
    void adminOperatorController_activatePlan() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        PlanResponse res = PlanResponse.builder().id(1L).isActive(true).build();
        when(planService.activatePlan(1L)).thenReturn(res);

        ResponseEntity<ApiResponse<PlanResponse>> result = controller.activatePlan(1L);
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_deactivatePlan() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        PlanResponse res = PlanResponse.builder().id(1L).isActive(false).build();
        when(planService.deactivatePlan(1L)).thenReturn(res);

        ResponseEntity<ApiResponse<PlanResponse>> result = controller.deactivatePlan(1L);
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_searchAllPlans_ascSort() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        when(planService.searchPlansWithStatus(any(), any(), any(), any())).thenReturn(new PageImpl<>(List.of()));

        ResponseEntity<ApiResponse<Page<PlanResponse>>> result =
                controller.searchAllPlans(null, null, null, 0, 10, "price", "ASC");
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void adminOperatorController_searchAllPlans_descSort() {
        IOperatorService operatorService = mock(IOperatorService.class);
        IPlanService planService = mock(IPlanService.class);
        AdminOperatorController controller = new AdminOperatorController(operatorService, planService);
        when(planService.searchPlansWithStatus(any(), any(), any(), any())).thenReturn(new PageImpl<>(List.of()));

        ResponseEntity<ApiResponse<Page<PlanResponse>>> result =
                controller.searchAllPlans(1L, PlanCategory.DATA, "ACTIVE", 0, 10, "price", "DESC");
        assertEquals(200, result.getStatusCode().value());
    }

    // ═══════════════════════════════════════════════════════════
    // AdminSystemController
    // ═══════════════════════════════════════════════════════════

    @Test
    void adminSystemController_rebuildCache() {
        SystemCacheService cacheService = mock(SystemCacheService.class);
        AdminSystemController controller = new AdminSystemController(cacheService);

        ResponseEntity<ApiResponse<String>> result = controller.rebuildCache();
        assertEquals(200, result.getStatusCode().value());
        verify(cacheService).rebuildRedisCache();
    }

    // ═══════════════════════════════════════════════════════════
    // Interfaces
    // ═══════════════════════════════════════════════════════════

    @Test
    void iOperatorService_isInterface() {
        assertTrue(IOperatorService.class.isInterface());
    }

    @Test
    void iPlanService_isInterface() {
        assertTrue(IPlanService.class.isInterface());
    }

    @Test
    void iOperatorDetectionService_isInterface() {
        assertTrue(IOperatorDetectionService.class.isInterface());
    }

    // ═══════════════════════════════════════════════════════════
    // Helper
    // ═══════════════════════════════════════════════════════════

    private Operator createTestOperator(String name) {
        Operator op = new Operator();
        op.setId(1L);
        op.setName(name);
        op.setCode(name.toUpperCase());
        op.setCategory(OperatorCategory.PREPAID);
        op.setIsActive(true);
        op.setPlans(new ArrayList<>());
        return op;
    }
}
