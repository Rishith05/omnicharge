package com.omnicharge.recharge;

import com.omnicharge.recharge.config.OpenApiConfig;
import com.omnicharge.recharge.config.FeignClientInterceptor;
import com.omnicharge.recharge.config.GatewayAuthenticationFilter;
import com.omnicharge.recharge.config.RabbitMQConfig;
import com.omnicharge.recharge.config.RedisCacheConfig;
import com.omnicharge.recharge.config.SecurityConfig;
import com.omnicharge.recharge.dto.*;
import com.omnicharge.recharge.entity.Recharge;
import com.omnicharge.recharge.entity.RechargeStatus;
import com.omnicharge.recharge.service.IRechargeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.FilterChain;
import feign.RequestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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
    // RechargeServiceApplication
    // ═══════════════════════════════════════════════════════════

    @Test
    void rechargeServiceApplication_canBeInstantiated() {
        RechargeServiceApplication app = new RechargeServiceApplication();
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
    void gatewayFilter_withoutHeaders_noAuthentication() throws Exception {
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
    void gatewayFilter_onlyUserId_noAuthentication() throws Exception {
        GatewayAuthenticationFilter filter = new GatewayAuthenticationFilter();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Id", "1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        SecurityContextHolder.clearContext();
        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request, response);
    }

    // ═══════════════════════════════════════════════════════════
    // FeignClientInterceptor
    // ═══════════════════════════════════════════════════════════

    @Test
    void feignClientInterceptor_withRequestContext_forwardsHeaders() {
        FeignClientInterceptor interceptor = new FeignClientInterceptor();
        
        MockHttpServletRequest httpRequest = new MockHttpServletRequest();
        httpRequest.addHeader("X-User-Id", "42");
        httpRequest.addHeader("X-User-Role", "ROLE_ADMIN");
        httpRequest.addHeader("X-User-Email", "admin@test.com");
        
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(httpRequest));
        
        RequestTemplate template = new RequestTemplate();
        interceptor.apply(template);
        
        assertTrue(template.headers().containsKey("X-User-Id"));
        assertTrue(template.headers().containsKey("X-User-Role"));
        assertTrue(template.headers().containsKey("X-User-Email"));
        
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void feignClientInterceptor_withoutRequestContext_doesNothing() {
        FeignClientInterceptor interceptor = new FeignClientInterceptor();
        RequestContextHolder.resetRequestAttributes();
        
        RequestTemplate template = new RequestTemplate();
        interceptor.apply(template);
        
        assertFalse(template.headers().containsKey("X-User-Id"));
    }

    @Test
    void feignClientInterceptor_withPartialHeaders_forwardsAvailable() {
        FeignClientInterceptor interceptor = new FeignClientInterceptor();
        
        MockHttpServletRequest httpRequest = new MockHttpServletRequest();
        httpRequest.addHeader("X-User-Id", "42");
        // No role or email headers
        
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(httpRequest));
        
        RequestTemplate template = new RequestTemplate();
        interceptor.apply(template);
        
        assertTrue(template.headers().containsKey("X-User-Id"));
        assertFalse(template.headers().containsKey("X-User-Role"));
        assertFalse(template.headers().containsKey("X-User-Email"));
        
        RequestContextHolder.resetRequestAttributes();
    }

    // ═══════════════════════════════════════════════════════════
    // RabbitMQConfig
    // ═══════════════════════════════════════════════════════════

    @Test
    void rabbitMQConfig_exchange() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.exchange());
        assertEquals("omnicharge.exchange", config.exchange().getName());
    }

    @Test
    void rabbitMQConfig_queues() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.paymentApprovedQueue());
        assertNotNull(config.paymentRejectedQueue());
        assertEquals("saga.recharge.approved", config.paymentApprovedQueue().getName());
        assertEquals("saga.recharge.rejected", config.paymentRejectedQueue().getName());
    }

    @Test
    void rabbitMQConfig_bindings() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.paymentApprovedBinding(config.paymentApprovedQueue(), config.exchange()));
        assertNotNull(config.paymentRejectedBinding(config.paymentRejectedQueue(), config.exchange()));
    }

    @Test
    void rabbitMQConfig_jsonMessageConverter() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.jsonMessageConverter());
    }

    // ═══════════════════════════════════════════════════════════
    // Recharge Entity
    // ═══════════════════════════════════════════════════════════

    @Test
    void recharge_gettersSetters() {
        Recharge recharge = new Recharge();
        recharge.setId(1L);
        recharge.setRechargeId("OMNI-12345678");
        recharge.setUserId(100L);
        recharge.setMobileNumber("9876543210");
        recharge.setOperatorId(10L);
        recharge.setOperatorName("Jio");
        recharge.setPlanId(5L);
        recharge.setPlanName("Unlimited Plan");
        recharge.setAmount(new BigDecimal("299.00"));
        recharge.setPlanValidityDays(28);
        recharge.setPlanExpiryDate(LocalDate.now().plusDays(28));
        recharge.setStatus(RechargeStatus.SUCCESS);
        recharge.setFailureReason(null);
        recharge.setTransactionId("TXN-123");

        assertEquals(1L, recharge.getId());
        assertEquals("OMNI-12345678", recharge.getRechargeId());
        assertEquals(100L, recharge.getUserId());
        assertEquals("9876543210", recharge.getMobileNumber());
        assertEquals(10L, recharge.getOperatorId());
        assertEquals("Jio", recharge.getOperatorName());
        assertEquals(5L, recharge.getPlanId());
        assertEquals("Unlimited Plan", recharge.getPlanName());
        assertEquals(new BigDecimal("299.00"), recharge.getAmount());
        assertEquals(28, recharge.getPlanValidityDays());
        assertNotNull(recharge.getPlanExpiryDate());
        assertEquals(RechargeStatus.SUCCESS, recharge.getStatus());
        assertNull(recharge.getFailureReason());
        assertEquals("TXN-123", recharge.getTransactionId());
    }

    @Test
    void recharge_noArgsConstructor() {
        Recharge recharge = new Recharge();
        assertNotNull(recharge);
    }

    @Test
    void recharge_equalsAndHashCode() {
        Recharge r1 = new Recharge();
        r1.setId(1L);
        r1.setRechargeId("OMNI-1");
        r1.setUserId(1L);
        r1.setMobileNumber("9876543210");
        r1.setOperatorId(1L);
        r1.setOperatorName("Jio");
        r1.setPlanId(1L);
        r1.setPlanName("Plan");
        r1.setAmount(BigDecimal.TEN);
        r1.setPlanValidityDays(28);
        r1.setPlanExpiryDate(LocalDate.now());
        r1.setStatus(RechargeStatus.SUCCESS);

        Recharge r2 = new Recharge();
        r2.setId(1L);
        r2.setRechargeId("OMNI-1");
        r2.setUserId(1L);
        r2.setMobileNumber("9876543210");
        r2.setOperatorId(1L);
        r2.setOperatorName("Jio");
        r2.setPlanId(1L);
        r2.setPlanName("Plan");
        r2.setAmount(BigDecimal.TEN);
        r2.setPlanValidityDays(28);
        r2.setPlanExpiryDate(r1.getPlanExpiryDate());
        r2.setStatus(RechargeStatus.SUCCESS);

        // Since Recharge uses @EqualsAndHashCode(callSuper = true) but Auditable doesn't override equals,
        // it falls back to Object.equals() which is reference equality.
        assertEquals(r1, r1);
        assertNotEquals(r1, r2);
        assertEquals(r1.hashCode(), r1.hashCode());
    }

    @Test
    void recharge_toString() {
        Recharge recharge = new Recharge();
        recharge.setRechargeId("OMNI-1");
        assertNotNull(recharge.toString());
        assertThat(recharge.toString()).contains("OMNI-1");
    }

    // ═══════════════════════════════════════════════════════════
    // RechargeStatus Enum
    // ═══════════════════════════════════════════════════════════

    @ParameterizedTest
    @EnumSource(RechargeStatus.class)
    void rechargeStatus_allValuesExist(RechargeStatus status) {
        assertNotNull(status);
        assertNotNull(status.name());
    }

    @Test
    void rechargeStatus_values() {
        RechargeStatus[] values = RechargeStatus.values();
        assertTrue(values.length >= 4);
    }

    @Test
    void rechargeStatus_valueOf() {
        assertEquals(RechargeStatus.INITIATED, RechargeStatus.valueOf("INITIATED"));
        assertEquals(RechargeStatus.PROCESSING, RechargeStatus.valueOf("PROCESSING"));
        assertEquals(RechargeStatus.SUCCESS, RechargeStatus.valueOf("SUCCESS"));
        assertEquals(RechargeStatus.FAILED, RechargeStatus.valueOf("FAILED"));
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - RechargeRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void rechargeRequest_gettersSetters() {
        RechargeRequest req = new RechargeRequest();
        req.setMobileNumber("9876543210");
        req.setOperatorId(1L);
        req.setPlanId(5L);
        req.setPaymentMethod("UPI");

        assertEquals("9876543210", req.getMobileNumber());
        assertEquals(1L, req.getOperatorId());
        assertEquals(5L, req.getPlanId());
        assertEquals("UPI", req.getPaymentMethod());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - RechargeResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void rechargeResponse_builder() {
        LocalDateTime now = LocalDateTime.now();
        RechargeResponse response = RechargeResponse.builder()
                .id(1L)
                .rechargeId("OMNI-1")
                .userId(100L)
                .mobileNumber("9876543210")
                .operatorId(10L)
                .operatorName("Jio")
                .planId(5L)
                .planName("Unlimited")
                .amount(BigDecimal.valueOf(299))
                .planValidityDays(28)
                .planExpiryDate(LocalDate.now())
                .status(RechargeStatus.SUCCESS)
                .failureReason(null)
                .transactionId("TXN-123")
                .createdDate(now)
                .build();

        assertEquals(1L, response.getId());
        assertEquals("OMNI-1", response.getRechargeId());
        assertEquals(100L, response.getUserId());
        assertEquals("9876543210", response.getMobileNumber());
        assertEquals(10L, response.getOperatorId());
        assertEquals("Jio", response.getOperatorName());
        assertEquals(5L, response.getPlanId());
        assertEquals("Unlimited", response.getPlanName());
        assertEquals(BigDecimal.valueOf(299), response.getAmount());
        assertEquals(28, response.getPlanValidityDays());
        assertNotNull(response.getPlanExpiryDate());
        assertEquals(RechargeStatus.SUCCESS, response.getStatus());
        assertNull(response.getFailureReason());
        assertEquals("TXN-123", response.getTransactionId());
        assertEquals(now, response.getCreatedDate());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - RechargeStatsResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void rechargeStatsResponse_builder() {
        RechargeStatsResponse response = RechargeStatsResponse.builder()
                .totalRecharges(100L)
                .successCount(80L)
                .failedCount(20L)
                .totalAmount(BigDecimal.valueOf(29900))
                .build();

        assertEquals(100L, response.getTotalRecharges());
        assertEquals(80L, response.getSuccessCount());
        assertEquals(20L, response.getFailedCount());
        assertEquals(BigDecimal.valueOf(29900), response.getTotalAmount());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - ExpiringRechargeResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void expiringRechargeResponse_builder() {
        ExpiringRechargeResponse response = ExpiringRechargeResponse.builder()
                .rechargeId("OMNI-1")
                .userId(1L)
                .userEmail("test@test.com")
                .userMobile("9876543210")
                .mobileNumber("9876543210")
                .operatorName("Jio")
                .planName("Plan")
                .amount(BigDecimal.valueOf(299))
                .expiryDate(LocalDate.now())
                .build();

        assertEquals("OMNI-1", response.getRechargeId());
        assertEquals(1L, response.getUserId());
        assertEquals("test@test.com", response.getUserEmail());
        assertEquals("9876543210", response.getUserMobile());
        assertEquals("9876543210", response.getMobileNumber());
        assertEquals("Jio", response.getOperatorName());
        assertEquals("Plan", response.getPlanName());
        assertEquals(BigDecimal.valueOf(299), response.getAmount());
        assertNotNull(response.getExpiryDate());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - PlanResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void planResponse_gettersSetters() {
        PlanResponse plan = new PlanResponse();
        plan.setId(1L);
        plan.setOperatorId(10L);
        plan.setOperatorName("Jio");
        plan.setPlanName("Unlimited");
        plan.setPrice(BigDecimal.valueOf(299));
        plan.setValidityDays(28);
        plan.setIsActive(true);

        assertEquals(1L, plan.getId());
        assertEquals(10L, plan.getOperatorId());
        assertEquals("Jio", plan.getOperatorName());
        assertEquals("Unlimited", plan.getPlanName());
        assertEquals(BigDecimal.valueOf(299), plan.getPrice());
        assertEquals(28, plan.getValidityDays());
        assertTrue(plan.getIsActive());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - PaymentRequest/Response (recharge-side)
    // ═══════════════════════════════════════════════════════════

    @Test
    void paymentRequest_gettersSetters() {
        PaymentRequest req = new PaymentRequest();
        req.setRechargeId("OMNI-1");
        req.setUserId(1L);
        req.setAmount(BigDecimal.valueOf(299));
        req.setPaymentMethod("UPI");

        assertEquals("OMNI-1", req.getRechargeId());
        assertEquals(1L, req.getUserId());
        assertEquals(BigDecimal.valueOf(299), req.getAmount());
        assertEquals("UPI", req.getPaymentMethod());
    }

    @Test
    void paymentResponse_gettersSetters() {
        PaymentResponse res = new PaymentResponse();
        res.setTransactionId("TXN-1");
        res.setStatus("SUCCESS");

        assertEquals("TXN-1", res.getTransactionId());
        assertEquals("SUCCESS", res.getStatus());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - UserProfileResponse (recharge-side)
    // ═══════════════════════════════════════════════════════════

    @Test
    void userProfileResponse_rechargeDto_gettersSetters() {
        UserProfileResponse user = new UserProfileResponse();
        user.setEmail("test@test.com");
        user.setMobileNumber("9876543210");

        assertEquals("test@test.com", user.getEmail());
        assertEquals("9876543210", user.getMobileNumber());
    }

    // ═══════════════════════════════════════════════════════════
    // IRechargeService interface
    // ═══════════════════════════════════════════════════════════

    @Test
    void iRechargeService_isInterface() {
        assertTrue(IRechargeService.class.isInterface());
    }
}
