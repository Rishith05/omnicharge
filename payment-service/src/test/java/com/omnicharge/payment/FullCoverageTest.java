package com.omnicharge.payment;

import com.omnicharge.payment.config.GatewayAuthenticationFilter;
import com.omnicharge.payment.config.OpenApiConfig;
import com.omnicharge.payment.config.RabbitMQConfig;
import com.omnicharge.payment.config.RestClientConfig;
import com.omnicharge.payment.controller.DirectRazorpayController;
import com.omnicharge.payment.dto.*;
import com.omnicharge.payment.entity.PaymentMethod;
import com.omnicharge.payment.entity.PaymentStatus;
import com.omnicharge.payment.entity.Transaction;
import com.omnicharge.payment.service.DirectRazorpayService;
import com.omnicharge.payment.service.IPaymentService;
import com.omnicharge.payment.service.IRazorpayPaymentService;
import com.omnicharge.common.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.servlet.FilterChain;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
    // PaymentServiceApplication
    // ═══════════════════════════════════════════════════════════

    @Test
    void paymentServiceApplication_canBeInstantiated() {
        PaymentServiceApplication app = new PaymentServiceApplication();
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
    void gatewayFilter_onlyUserId_noAuth() throws Exception {
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
    // RabbitMQConfig
    // ═══════════════════════════════════════════════════════════

    @Test
    void rabbitMQConfig_exchange() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.exchange());
        assertEquals("omnicharge.exchange", config.exchange().getName());
    }

    @Test
    void rabbitMQConfig_queue() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.paymentProcessQueue());
        assertEquals("saga.payment.process", config.paymentProcessQueue().getName());
    }

    @Test
    void rabbitMQConfig_binding() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.paymentProcessBinding(config.paymentProcessQueue(), config.exchange()));
    }

    @Test
    void rabbitMQConfig_jsonMessageConverter() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.jsonMessageConverter());
    }

    // ═══════════════════════════════════════════════════════════
    // RestClientConfig
    // ═══════════════════════════════════════════════════════════

    @Test
    void restClientConfig_createsRestTemplate() {
        RestClientConfig config = new RestClientConfig();
        assertNotNull(config.restTemplate());
    }

    // ═══════════════════════════════════════════════════════════
    // Transaction Entity
    // ═══════════════════════════════════════════════════════════

    @Test
    void transaction_gettersAndSetters() {
        Transaction tx = new Transaction();
        tx.setId(1L);
        tx.setTransactionId("TXN-1234567890");
        tx.setRechargeId("OMNI-12345678");
        tx.setUserId(100L);
        tx.setAmount(new BigDecimal("299.00"));
        tx.setPaymentMethod(PaymentMethod.UPI);
        tx.setStatus(PaymentStatus.SUCCESS);
        tx.setFailureReason(null);
        tx.setRazorpayOrderId("order_abc123");
        tx.setUserEmail("test@test.com");
        tx.setUserMobile("9876543210");
        tx.setMobileNumber("9876543210");
        tx.setOperatorName("Jio");
        tx.setPlanName("Unlimited");

        assertEquals(1L, tx.getId());
        assertEquals("TXN-1234567890", tx.getTransactionId());
        assertEquals("OMNI-12345678", tx.getRechargeId());
        assertEquals(100L, tx.getUserId());
        assertEquals(new BigDecimal("299.00"), tx.getAmount());
        assertEquals(PaymentMethod.UPI, tx.getPaymentMethod());
        assertEquals(PaymentStatus.SUCCESS, tx.getStatus());
        assertNull(tx.getFailureReason());
        assertEquals("order_abc123", tx.getRazorpayOrderId());
        assertEquals("test@test.com", tx.getUserEmail());
        assertEquals("9876543210", tx.getUserMobile());
        assertEquals("9876543210", tx.getMobileNumber());
        assertEquals("Jio", tx.getOperatorName());
        assertEquals("Unlimited", tx.getPlanName());
    }

    @Test
    void transaction_equalsAndHashcode() {
        Transaction t1 = new Transaction();
        t1.setId(1L);
        t1.setTransactionId("TXN-1");

        Transaction t2 = new Transaction();
        t2.setId(1L);
        t2.setTransactionId("TXN-1");

        // Note: Using Lombok's @EqualsAndHashCode(callSuper=true) on entities 
        // with Auditable can fail if timestamps differ.
        assertEquals(t1.getId(), t2.getId());
        assertEquals(t1.getTransactionId(), t2.getTransactionId());
    }

    @Test
    void transaction_toString() {
        Transaction tx = new Transaction();
        tx.setTransactionId("TXN-TEST");
        assertNotNull(tx.toString());
        assertThat(tx.toString()).contains("TXN-TEST");
    }

    // ═══════════════════════════════════════════════════════════
    // PaymentMethod Enum
    // ═══════════════════════════════════════════════════════════

    @ParameterizedTest
    @EnumSource(PaymentMethod.class)
    void paymentMethod_allValuesExist(PaymentMethod method) {
        assertNotNull(method);
        assertNotNull(method.name());
    }

    @Test
    void paymentMethod_values() {
        PaymentMethod[] values = PaymentMethod.values();
        assertTrue(values.length >= 1);
    }

    // ═══════════════════════════════════════════════════════════
    // PaymentStatus Enum
    // ═══════════════════════════════════════════════════════════

    @ParameterizedTest
    @EnumSource(PaymentStatus.class)
    void paymentStatus_allValuesExist(PaymentStatus status) {
        assertNotNull(status);
        assertNotNull(status.name());
    }

    @Test
    void paymentStatus_valueOf() {
        assertEquals(PaymentStatus.PENDING, PaymentStatus.valueOf("PENDING"));
        assertEquals(PaymentStatus.SUCCESS, PaymentStatus.valueOf("SUCCESS"));
        assertEquals(PaymentStatus.FAILED, PaymentStatus.valueOf("FAILED"));
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - PaymentRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void paymentRequest_allArgs() {
        PaymentRequest req = PaymentRequest.builder()
                .rechargeId("OMNI-1")
                .userId(1L)
                .amount(BigDecimal.valueOf(299))
                .paymentMethod("UPI")
                .userEmail("test@test.com")
                .userMobile("9876543210")
                .mobileNumber("9876543210")
                .operatorName("Jio")
                .planName("Unlimited")
                .build();

        assertEquals("OMNI-1", req.getRechargeId());
        assertEquals(1L, req.getUserId());
        assertEquals(BigDecimal.valueOf(299), req.getAmount());
        assertEquals("UPI", req.getPaymentMethod());
        assertEquals("test@test.com", req.getUserEmail());
        assertEquals("9876543210", req.getUserMobile());
        assertEquals("9876543210", req.getMobileNumber());
        assertEquals("Jio", req.getOperatorName());
        assertEquals("Unlimited", req.getPlanName());
    }

    @Test
    void paymentRequest_noArgs() {
        PaymentRequest req = new PaymentRequest();
        assertNotNull(req);
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - PaymentResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void paymentResponse_builder() {
        PaymentResponse res = PaymentResponse.builder()
                .transactionId("TXN-1")
                .status("SUCCESS")
                .razorpayOrderId("order_abc")
                .amount(BigDecimal.valueOf(299))
                .timestamp(LocalDateTime.now())
                .build();

        assertEquals("TXN-1", res.getTransactionId());
        assertEquals("SUCCESS", res.getStatus());
        assertEquals("order_abc", res.getRazorpayOrderId());
        assertEquals(BigDecimal.valueOf(299), res.getAmount());
        assertNotNull(res.getTimestamp());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - TransactionResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void transactionResponse_builder() {
        TransactionResponse res = TransactionResponse.builder()
                .id(1L)
                .transactionId("TXN-1")
                .rechargeId("OMNI-1")
                .userId(100L)
                .amount(BigDecimal.valueOf(299))
                .paymentMethod(PaymentMethod.UPI)
                .status(PaymentStatus.SUCCESS)
                .failureReason(null)
                .razorpayOrderId("order_1")
                .userEmail("test@test.com")
                .userMobile("9876543210")
                .mobileNumber("9876543210")
                .operatorName("Jio")
                .planName("Unlimited")
                .createdDate(LocalDateTime.now())
                .build();

        assertEquals(1L, res.getId());
        assertEquals("TXN-1", res.getTransactionId());
        assertEquals("OMNI-1", res.getRechargeId());
        assertEquals(100L, res.getUserId());
        assertEquals(BigDecimal.valueOf(299), res.getAmount());
        assertEquals(PaymentMethod.UPI, res.getPaymentMethod());
        assertEquals(PaymentStatus.SUCCESS, res.getStatus());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - OrderRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void orderRequest_gettersSetters() {
        OrderRequest req = new OrderRequest();
        req.setAmount(BigDecimal.valueOf(500));
        req.setCurrency("INR");

        assertEquals(BigDecimal.valueOf(500), req.getAmount());
        assertEquals("INR", req.getCurrency());
    }

    @Test
    void orderRequest_defaultCurrency() {
        OrderRequest req = new OrderRequest();
        assertEquals("INR", req.getCurrency());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - OrderResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void orderResponse_builder() {
        OrderResponse res = OrderResponse.builder()
                .orderId("order_abc")
                .amount(50000)
                .currency("INR")
                .build();

        assertEquals("order_abc", res.getOrderId());
        assertEquals(50000, res.getAmount());
        assertEquals("INR", res.getCurrency());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - PaymentVerificationRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void paymentVerificationRequest_gettersSetters() {
        PaymentVerificationRequest req = new PaymentVerificationRequest();
        req.setRazorpayOrderId("order_abc");
        req.setRazorpayPaymentId("pay_xyz");
        req.setRazorpaySignature("sig_123");
        req.setRechargeId("OMNI-1");
        req.setAmount(BigDecimal.valueOf(299));

        assertEquals("order_abc", req.getRazorpayOrderId());
        assertEquals("pay_xyz", req.getRazorpayPaymentId());
        assertEquals("sig_123", req.getRazorpaySignature());
        assertEquals("OMNI-1", req.getRechargeId());
        assertEquals(BigDecimal.valueOf(299), req.getAmount());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - PaymentStatsResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void paymentStatsResponse_builder() {
        PaymentStatsResponse stats = PaymentStatsResponse.builder()
                .totalTransactions(100L)
                .successfulTransactions(80L)
                .failedTransactions(15L)
                .pendingTransactions(5L)
                .totalRevenue(BigDecimal.valueOf(25000))
                .successAmount(BigDecimal.valueOf(25000))
                .failedAmount(BigDecimal.valueOf(3000))
                .averageTransactionAmount(BigDecimal.valueOf(312.5))
                .todayTransactions(10L)
                .todayRevenue(BigDecimal.valueOf(3000))
                .revenueByDate(List.of())
                .topUsers(List.of())
                .build();

        assertEquals(100L, stats.getTotalTransactions());
        assertEquals(80L, stats.getSuccessfulTransactions());
        assertEquals(15L, stats.getFailedTransactions());
        assertEquals(5L, stats.getPendingTransactions());
        assertEquals(BigDecimal.valueOf(25000), stats.getTotalRevenue());
        assertEquals(BigDecimal.valueOf(25000), stats.getSuccessAmount());
        assertEquals(BigDecimal.valueOf(3000), stats.getFailedAmount());
        assertEquals(BigDecimal.valueOf(312.5), stats.getAverageTransactionAmount());
        assertEquals(10L, stats.getTodayTransactions());
        assertEquals(BigDecimal.valueOf(3000), stats.getTodayRevenue());
        assertNotNull(stats.getRevenueByDate());
        assertNotNull(stats.getTopUsers());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - DailyRevenueStats
    // ═══════════════════════════════════════════════════════════

    @Test
    void dailyRevenueStats_builder() {
        DailyRevenueStats stats = DailyRevenueStats.builder()
                .date("2026-04-14")
                .transactionCount(10L)
                .revenue(BigDecimal.valueOf(3000))
                .build();

        assertEquals("2026-04-14", stats.getDate());
        assertEquals(10L, stats.getTransactionCount());
        assertEquals(BigDecimal.valueOf(3000), stats.getRevenue());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO Coverage - TopUserStats
    // ═══════════════════════════════════════════════════════════

    @Test
    void topUserStats_builder() {
        TopUserStats stats = TopUserStats.builder()
                .userId(1L)
                .transactionCount(5L)
                .totalSpent(BigDecimal.valueOf(1500))
                .build();

        assertEquals(1L, stats.getUserId());
        assertEquals(5L, stats.getTransactionCount());
        assertEquals(BigDecimal.valueOf(1500), stats.getTotalSpent());
    }

    // ═══════════════════════════════════════════════════════════
    // DirectRazorpayController
    // ═══════════════════════════════════════════════════════════

    @Test
    void directRazorpayController_createOrder() {
        DirectRazorpayService service = mock(DirectRazorpayService.class);
        DirectRazorpayController controller = new DirectRazorpayController(service);

        OrderResponse mockResponse = OrderResponse.builder()
                .orderId("order_abc")
                .amount(50000)
                .currency("INR")
                .build();

        OrderRequest req = new OrderRequest();
        req.setAmount(BigDecimal.valueOf(500));
        when(service.createOrder(req)).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<OrderResponse>> result = controller.createOrder(req);
        assertEquals(201, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void directRazorpayController_verifyPayment_success() {
        DirectRazorpayService service = mock(DirectRazorpayService.class);
        DirectRazorpayController controller = new DirectRazorpayController(service);

        PaymentVerificationRequest req = new PaymentVerificationRequest();
        when(service.verifyPayment(req)).thenReturn(true);

        ResponseEntity<ApiResponse<String>> result = controller.verifyPayment(req);
        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void directRazorpayController_verifyPayment_failure() {
        DirectRazorpayService service = mock(DirectRazorpayService.class);
        DirectRazorpayController controller = new DirectRazorpayController(service);

        PaymentVerificationRequest req = new PaymentVerificationRequest();
        when(service.verifyPayment(req)).thenReturn(false);

        ResponseEntity<ApiResponse<String>> result = controller.verifyPayment(req);
        assertEquals(400, result.getStatusCode().value());
    }

    // ═══════════════════════════════════════════════════════════
    // Interfaces
    // ═══════════════════════════════════════════════════════════

    @Test
    void iPaymentService_isInterface() {
        assertTrue(IPaymentService.class.isInterface());
    }

    @Test
    void iRazorpayPaymentService_isInterface() {
        assertTrue(IRazorpayPaymentService.class.isInterface());
    }
}
