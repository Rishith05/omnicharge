package com.omnicharge.notification;

import com.omnicharge.notification.config.GatewayAuthenticationFilter;
import com.omnicharge.notification.config.OpenApiConfig;
import com.omnicharge.notification.config.RabbitMQConfig;
import com.omnicharge.notification.controller.AdminNotificationController;
import com.omnicharge.notification.controller.NotificationController;
import com.omnicharge.notification.dto.*;
import com.omnicharge.notification.entity.*;
import com.omnicharge.notification.service.INotificationService;
import com.omnicharge.notification.service.IEmailService;
import com.omnicharge.notification.service.ISmsService;
import com.omnicharge.common.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.servlet.FilterChain;
import java.math.BigDecimal;
import java.time.LocalDate;
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
    // NotificationServiceApplication
    // ═══════════════════════════════════════════════════════════

    @Test
    void notificationServiceApplication_canBeInstantiated() {
        NotificationServiceApplication app = new NotificationServiceApplication();
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
    void rabbitMQConfig_queues() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.rechargeQueue());
        assertNotNull(config.paymentQueue());
        assertEquals("notification.recharge.queue", config.rechargeQueue().getName());
        assertEquals("notification.payment.queue", config.paymentQueue().getName());
    }

    @Test
    void rabbitMQConfig_bindings() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.rechargeBinding(config.rechargeQueue(), config.exchange()));
        assertNotNull(config.paymentBinding(config.paymentQueue(), config.exchange()));
    }

    @Test
    void rabbitMQConfig_jsonMessageConverter() {
        RabbitMQConfig config = new RabbitMQConfig();
        assertNotNull(config.jsonMessageConverter());
    }

    // ═══════════════════════════════════════════════════════════
    // Notification Entity
    // ═══════════════════════════════════════════════════════════

    @Test
    void notification_gettersSetters() {
        Notification n = new Notification();
        n.setId(1L);
        n.setUserId(100L);
        n.setUserEmail("test@test.com");
        n.setUserMobile("9876543210");
        n.setType(NotificationType.EMAIL);
        n.setCategory(NotificationCategory.PAYMENT_SUCCESS);
        n.setSubject("Payment Successful");
        n.setMessage("Your payment was successful");
        n.setStatus(NotificationStatus.SENT);
        n.setReferenceId("TXN-123");
        n.setIsRead(false);

        assertEquals(1L, n.getId());
        assertEquals(100L, n.getUserId());
        assertEquals("test@test.com", n.getUserEmail());
        assertEquals("9876543210", n.getUserMobile());
        assertEquals(NotificationType.EMAIL, n.getType());
        assertEquals(NotificationCategory.PAYMENT_SUCCESS, n.getCategory());
        assertEquals("Payment Successful", n.getSubject());
        assertEquals("Your payment was successful", n.getMessage());
        assertEquals(NotificationStatus.SENT, n.getStatus());
        assertEquals("TXN-123", n.getReferenceId());
        assertFalse(n.getIsRead());
    }

    @Test
    void notification_equalsAndHashCode() {
        Notification n1 = new Notification();
        n1.setId(1L);
        n1.setUserId(1L);
        n1.setUserEmail("a@a.com");
        n1.setType(NotificationType.EMAIL);
        n1.setCategory(NotificationCategory.PAYMENT_SUCCESS);
        n1.setSubject("Sub");
        n1.setMessage("Msg");
        n1.setStatus(NotificationStatus.SENT);
        n1.setIsRead(false);

        Notification n2 = new Notification();
        n2.setId(1L);
        n2.setUserId(1L);
        n2.setUserEmail("a@a.com");
        n2.setType(NotificationType.EMAIL);
        n2.setCategory(NotificationCategory.PAYMENT_SUCCESS);
        n2.setSubject("Sub");
        n2.setMessage("Msg");
        n2.setStatus(NotificationStatus.SENT);
        n2.setIsRead(false);

        // Since Notification uses @EqualsAndHashCode(callSuper = true) but Auditable doesn't override equals,
        // it falls back to Object.equals() which is reference equality.
        assertEquals(n1, n1);
        assertNotEquals(n1, n2);
        assertEquals(n1.hashCode(), n1.hashCode());
    }

    @Test
    void notification_toString() {
        Notification n = new Notification();
        n.setSubject("Test Subject");
        assertNotNull(n.toString());
        assertThat(n.toString()).contains("Test Subject");
    }

    // ═══════════════════════════════════════════════════════════
    // NotificationPreference Entity
    // ═══════════════════════════════════════════════════════════

    @Test
    void notificationPreference_gettersSetters() {
        NotificationPreference pref = new NotificationPreference();
        pref.setId(1L);
        pref.setUserId(100L);
        pref.setCategory(NotificationCategory.PAYMENT_SUCCESS);
        pref.setEmailEnabled(true);
        pref.setSmsEnabled(false);
        pref.setIsEnabled(true);

        assertEquals(1L, pref.getId());
        assertEquals(100L, pref.getUserId());
        assertEquals(NotificationCategory.PAYMENT_SUCCESS, pref.getCategory());
        assertTrue(pref.getEmailEnabled());
        assertFalse(pref.getSmsEnabled());
        assertTrue(pref.getIsEnabled());
    }

    @Test
    void notificationPreference_defaults() {
        NotificationPreference pref = new NotificationPreference();
        assertTrue(pref.getEmailEnabled());
        assertTrue(pref.getSmsEnabled());
        assertTrue(pref.getIsEnabled());
    }

    // ═══════════════════════════════════════════════════════════
    // NotificationTemplate Entity
    // ═══════════════════════════════════════════════════════════

    @Test
    void notificationTemplate_gettersSetters() {
        NotificationTemplate tmpl = new NotificationTemplate();
        tmpl.setId(1L);
        tmpl.setCategory(NotificationCategory.PAYMENT_SUCCESS);
        tmpl.setEmailSubject("Payment Success");
        tmpl.setEmailBody("<h1>Success</h1>");
        tmpl.setSmsBody("Payment successful");
        tmpl.setIsActive(true);
        tmpl.setDescription("Template for payment success");

        assertEquals(1L, tmpl.getId());
        assertEquals(NotificationCategory.PAYMENT_SUCCESS, tmpl.getCategory());
        assertEquals("Payment Success", tmpl.getEmailSubject());
        assertEquals("<h1>Success</h1>", tmpl.getEmailBody());
        assertEquals("Payment successful", tmpl.getSmsBody());
        assertTrue(tmpl.getIsActive());
        assertEquals("Template for payment success", tmpl.getDescription());
    }

    // ═══════════════════════════════════════════════════════════
    // Enums
    // ═══════════════════════════════════════════════════════════

    @ParameterizedTest
    @EnumSource(NotificationType.class)
    void notificationType_allValues(NotificationType type) {
        assertNotNull(type);
        assertNotNull(type.name());
    }

    @Test
    void notificationType_valueOf() {
        assertEquals(NotificationType.EMAIL, NotificationType.valueOf("EMAIL"));
        assertEquals(NotificationType.SMS, NotificationType.valueOf("SMS"));
    }

    @ParameterizedTest
    @EnumSource(NotificationCategory.class)
    void notificationCategory_allValues(NotificationCategory cat) {
        assertNotNull(cat);
    }

    @Test
    void notificationCategory_valueOf() {
        assertEquals(NotificationCategory.PAYMENT_SUCCESS, NotificationCategory.valueOf("PAYMENT_SUCCESS"));
        assertEquals(NotificationCategory.PAYMENT_FAILED, NotificationCategory.valueOf("PAYMENT_FAILED"));
        assertEquals(NotificationCategory.PLAN_EXPIRY_REMINDER, NotificationCategory.valueOf("PLAN_EXPIRY_REMINDER"));
        assertEquals(NotificationCategory.PLAN_EXPIRED, NotificationCategory.valueOf("PLAN_EXPIRED"));
    }

    @ParameterizedTest
    @EnumSource(NotificationStatus.class)
    void notificationStatus_allValues(NotificationStatus status) {
        assertNotNull(status);
    }

    @Test
    void notificationStatus_valueOf() {
        assertEquals(NotificationStatus.PENDING, NotificationStatus.valueOf("PENDING"));
        assertEquals(NotificationStatus.SENT, NotificationStatus.valueOf("SENT"));
        assertEquals(NotificationStatus.FAILED, NotificationStatus.valueOf("FAILED"));
    }

    @ParameterizedTest
    @EnumSource(NotificationPriority.class)
    void notificationPriority_allValues(NotificationPriority priority) {
        assertNotNull(priority);
    }

    @Test
    void notificationPriority_valueOf() {
        assertEquals(NotificationPriority.LOW, NotificationPriority.valueOf("LOW"));
        assertEquals(NotificationPriority.NORMAL, NotificationPriority.valueOf("NORMAL"));
        assertEquals(NotificationPriority.HIGH, NotificationPriority.valueOf("HIGH"));
        assertEquals(NotificationPriority.URGENT, NotificationPriority.valueOf("URGENT"));
    }

    // ═══════════════════════════════════════════════════════════
    // DTO - NotificationResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void notificationResponse_builder() {
        NotificationResponse res = NotificationResponse.builder()
                .id(1L)
                .userId(100L)
                .type(NotificationType.EMAIL)
                .category(NotificationCategory.PAYMENT_SUCCESS)
                .subject("Payment Successful")
                .message("Your payment was successful")
                .status(NotificationStatus.SENT)
                .referenceId("TXN-123")
                .isRead(false)
                .createdDate(LocalDateTime.now())
                .build();

        assertEquals(1L, res.getId());
        assertEquals(100L, res.getUserId());
        assertEquals(NotificationType.EMAIL, res.getType());
        assertEquals(NotificationCategory.PAYMENT_SUCCESS, res.getCategory());
        assertEquals("Payment Successful", res.getSubject());
    }

    @Test
    void notificationResponse_noArgs() {
        NotificationResponse res = new NotificationResponse();
        assertNotNull(res);
    }

    // ═══════════════════════════════════════════════════════════
    // DTO - NotificationStatsResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void notificationStatsResponse_builder() {
        NotificationStatsResponse stats = NotificationStatsResponse.builder()
                .totalNotifications(100L)
                .sentCount(80L)
                .failedCount(10L)
                .pendingCount(5L)
                .unreadCount(25L)
                .build();

        assertEquals(100L, stats.getTotalNotifications());
        assertEquals(80L, stats.getSentCount());
        assertEquals(10L, stats.getFailedCount());
        assertEquals(5L, stats.getPendingCount());
        assertEquals(25L, stats.getUnreadCount());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO - NotificationPreferenceRequest
    // ═══════════════════════════════════════════════════════════

    @Test
    void notificationPreferenceRequest_gettersSetters() {
        NotificationPreferenceRequest req = new NotificationPreferenceRequest();
        req.setCategory(NotificationCategory.PAYMENT_SUCCESS);
        req.setEmailEnabled(true);
        req.setSmsEnabled(false);
        req.setIsEnabled(true);

        assertEquals(NotificationCategory.PAYMENT_SUCCESS, req.getCategory());
        assertTrue(req.getEmailEnabled());
        assertFalse(req.getSmsEnabled());
        assertTrue(req.getIsEnabled());
    }

    @Test
    void notificationPreferenceRequest_allArgs() {
        NotificationPreferenceRequest req = new NotificationPreferenceRequest(
                NotificationCategory.PAYMENT_FAILED, true, true, true);
        assertEquals(NotificationCategory.PAYMENT_FAILED, req.getCategory());
    }

    // ═══════════════════════════════════════════════════════════
    // DTO - ExpiringRechargeResponse
    // ═══════════════════════════════════════════════════════════

    @Test
    void expiringRechargeResponse_builder() {
        ExpiringRechargeResponse res = ExpiringRechargeResponse.builder()
                .rechargeId("OMNI-1")
                .userId(1L)
                .userEmail("test@test.com")
                .userMobile("9876543210")
                .mobileNumber("9876543210")
                .operatorName("Jio")
                .planName("Unlimited")
                .amount(BigDecimal.valueOf(299))
                .expiryDate(LocalDate.now().plusDays(3))
                .build();

        assertEquals("OMNI-1", res.getRechargeId());
        assertEquals(1L, res.getUserId());
        assertNotNull(res.getExpiryDate());
    }

    // ═══════════════════════════════════════════════════════════
    // NotificationController - additional coverage
    // ═══════════════════════════════════════════════════════════

    @Test
    void notificationController_getUserNotifications_ascSort() {
        INotificationService service = mock(INotificationService.class);
        NotificationController controller = new NotificationController(service);

        Page<NotificationResponse> page = new PageImpl<>(List.of());
        when(service.getUserNotifications(eq(1L), any())).thenReturn(page);

        ResponseEntity<ApiResponse<Page<NotificationResponse>>> result =
                controller.getUserNotifications(1L, 0, 10, "createdDate", "ASC");

        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void notificationController_getUserNotifications_descSort() {
        INotificationService service = mock(INotificationService.class);
        NotificationController controller = new NotificationController(service);

        Page<NotificationResponse> page = new PageImpl<>(List.of());
        when(service.getUserNotifications(eq(1L), any())).thenReturn(page);

        ResponseEntity<ApiResponse<Page<NotificationResponse>>> result =
                controller.getUserNotifications(1L, 0, 10, "createdDate", "DESC");

        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void notificationController_markAsRead() {
        INotificationService service = mock(INotificationService.class);
        NotificationController controller = new NotificationController(service);

        ResponseEntity<ApiResponse<Void>> result = controller.markAsRead(1L, 100L);
        assertEquals(200, result.getStatusCode().value());
        verify(service).markAsRead(1L, 100L);
    }

    @Test
    void notificationController_getUnreadCount() {
        INotificationService service = mock(INotificationService.class);
        NotificationController controller = new NotificationController(service);
        when(service.getUnreadCount(1L)).thenReturn(5L);

        ResponseEntity<ApiResponse<Long>> result = controller.getUnreadCount(1L);
        assertEquals(200, result.getStatusCode().value());
        assertEquals(5L, result.getBody().getData());
    }

    // ═══════════════════════════════════════════════════════════
    // AdminNotificationController
    // ═══════════════════════════════════════════════════════════

    @Test
    void adminController_getAllNotifications_ascSort() {
        INotificationService service = mock(INotificationService.class);
        AdminNotificationController controller = new AdminNotificationController(service);

        Page<NotificationResponse> page = new PageImpl<>(List.of());
        when(service.getAllNotifications(any())).thenReturn(page);

        ResponseEntity<ApiResponse<Page<NotificationResponse>>> result =
                controller.getAllNotifications(0, 10, "createdDate", "ASC");

        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void adminController_getAllNotifications_descSort() {
        INotificationService service = mock(INotificationService.class);
        AdminNotificationController controller = new AdminNotificationController(service);

        Page<NotificationResponse> page = new PageImpl<>(List.of());
        when(service.getAllNotifications(any())).thenReturn(page);

        ResponseEntity<ApiResponse<Page<NotificationResponse>>> result =
                controller.getAllNotifications(0, 10, "createdDate", "DESC");

        assertEquals(200, result.getStatusCode().value());
    }

    // ═══════════════════════════════════════════════════════════
    // Interfaces
    // ═══════════════════════════════════════════════════════════

    @Test
    void iNotificationService_isInterface() {
        assertTrue(INotificationService.class.isInterface());
    }

    @Test
    void iEmailService_isInterface() {
        assertTrue(IEmailService.class.isInterface());
    }

    @Test
    void iSmsService_isInterface() {
        assertTrue(ISmsService.class.isInterface());
    }
}
