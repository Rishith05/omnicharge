package com.omnicharge.notification.controller;

import com.omnicharge.common.dto.ApiResponse;
import com.omnicharge.notification.entity.*;
import com.omnicharge.notification.repository.NotificationRepository;
import com.omnicharge.notification.service.ISmsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;

import jakarta.mail.internet.MimeMessage;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TestControllerTest {

    private JavaMailSender mailSender;
    private ISmsService smsService;
    private NotificationRepository notificationRepository;
    private TestController controller;

    @BeforeEach
    void setUp() {
        mailSender = mock(JavaMailSender.class);
        smsService = mock(ISmsService.class);
        notificationRepository = mock(NotificationRepository.class);
        controller = new TestController(mailSender, smsService, notificationRepository);
    }

    // ═══════════════════════════════════════════════════════════
    // testEmail
    // ═══════════════════════════════════════════════════════════

    @Test
    void testEmail_success() throws Exception {
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doNothing().when(mailSender).send(any(MimeMessage.class));

        ResponseEntity<ApiResponse<Map<String, String>>> result = controller.testEmail("test@test.com");

        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().isSuccess());
        assertEquals("SUCCESS", result.getBody().getData().get("status"));
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void testEmail_defaultParam() throws Exception {
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doNothing().when(mailSender).send(any(MimeMessage.class));

        ResponseEntity<ApiResponse<Map<String, String>>> result = controller.testEmail("avunashdhanuka@gmail.com");

        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void testEmail_failure() throws Exception {
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("SMTP down"));

        ResponseEntity<ApiResponse<Map<String, String>>> result = controller.testEmail("test@test.com");

        assertEquals(500, result.getStatusCode().value());
        assertFalse(result.getBody().isSuccess());
        assertEquals("FAILED", result.getBody().getData().get("status"));
    }

    // ═══════════════════════════════════════════════════════════
    // testSms
    // ═══════════════════════════════════════════════════════════

    @Test
    void testSms_success() {
        doNothing().when(smsService).sendSms(anyString(), anyString());

        ResponseEntity<ApiResponse<Map<String, String>>> result = controller.testSms("+919876543210");

        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().isSuccess());
        assertEquals("SUCCESS", result.getBody().getData().get("status"));
    }

    @Test
    void testSms_failure() {
        doThrow(new RuntimeException("Twilio error")).when(smsService).sendSms(anyString(), anyString());

        ResponseEntity<ApiResponse<Map<String, String>>> result = controller.testSms("+919876543210");

        assertEquals(500, result.getStatusCode().value());
        assertFalse(result.getBody().isSuccess());
        assertEquals("FAILED", result.getBody().getData().get("status"));
    }

    // ═══════════════════════════════════════════════════════════
    // testDatabase
    // ═══════════════════════════════════════════════════════════

    @Test
    void testDatabase_success() {
        Notification saved = new Notification();
        saved.setId(1L);
        saved.setReferenceId("TEST-123");
        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);
        when(notificationRepository.count()).thenReturn(5L);

        ResponseEntity<ApiResponse<Map<String, Object>>> result = controller.testDatabase();

        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().isSuccess());
        assertEquals("SUCCESS", result.getBody().getData().get("status"));
        assertEquals(1L, result.getBody().getData().get("notificationId"));
        assertEquals(5L, result.getBody().getData().get("totalNotifications"));
    }

    @Test
    void testDatabase_failure() {
        when(notificationRepository.save(any(Notification.class)))
                .thenThrow(new RuntimeException("DB connection failed"));

        ResponseEntity<ApiResponse<Map<String, Object>>> result = controller.testDatabase();

        assertEquals(500, result.getStatusCode().value());
        assertFalse(result.getBody().isSuccess());
        assertEquals("FAILED", result.getBody().getData().get("status"));
    }

    // ═══════════════════════════════════════════════════════════
    // testAll
    // ═══════════════════════════════════════════════════════════

    @Test
    void testAll_allSuccess() throws Exception {
        // Database
        Notification saved = new Notification();
        saved.setId(1L);
        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);

        // Email
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doNothing().when(mailSender).send(any(MimeMessage.class));

        // SMS
        doNothing().when(smsService).sendSms(anyString(), anyString());

        ResponseEntity<ApiResponse<Map<String, Object>>> result = controller.testAll();

        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().isSuccess());
        assertTrue(result.getBody().getData().get("database").toString().contains("SUCCESS"));
        assertEquals("SUCCESS", result.getBody().getData().get("email"));
        assertEquals("SUCCESS", result.getBody().getData().get("sms"));
    }

    @Test
    void testAll_databaseFails() {
        // Database fails
        when(notificationRepository.save(any(Notification.class)))
                .thenThrow(new RuntimeException("DB down"));

        // Email
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doNothing().when(mailSender).send(any(MimeMessage.class));

        // SMS
        doNothing().when(smsService).sendSms(anyString(), anyString());

        ResponseEntity<ApiResponse<Map<String, Object>>> result = controller.testAll();

        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().getData().get("database").toString().contains("FAILED"));
    }

    @Test
    void testAll_emailFails() {
        // Database
        Notification saved = new Notification();
        saved.setId(1L);
        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);

        // Email fails
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("SMTP down"));

        // SMS
        doNothing().when(smsService).sendSms(anyString(), anyString());

        ResponseEntity<ApiResponse<Map<String, Object>>> result = controller.testAll();

        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().getData().get("email").toString().contains("FAILED"));
    }

    @Test
    void testAll_smsFails() {
        // Database
        Notification saved = new Notification();
        saved.setId(1L);
        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);

        // Email
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doNothing().when(mailSender).send(any(MimeMessage.class));

        // SMS fails
        doThrow(new RuntimeException("Twilio down")).when(smsService).sendSms(anyString(), anyString());

        ResponseEntity<ApiResponse<Map<String, Object>>> result = controller.testAll();

        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().getData().get("sms").toString().contains("FAILED"));
    }

    // ═══════════════════════════════════════════════════════════
    // getNotificationCount
    // ═══════════════════════════════════════════════════════════

    @Test
    void getNotificationCount_success() {
        when(notificationRepository.count()).thenReturn(42L);

        ResponseEntity<ApiResponse<Map<String, Long>>> result = controller.getNotificationCount();

        assertEquals(200, result.getStatusCode().value());
        assertTrue(result.getBody().isSuccess());
        assertEquals(42L, result.getBody().getData().get("totalNotifications"));
    }

    @Test
    void getNotificationCount_failure() {
        when(notificationRepository.count()).thenThrow(new RuntimeException("DB error"));

        ResponseEntity<ApiResponse<Map<String, Long>>> result = controller.getNotificationCount();

        assertEquals(500, result.getStatusCode().value());
    }
}
