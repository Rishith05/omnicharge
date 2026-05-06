package com.omnicharge.notification.service;

import com.omnicharge.common.exception.BadRequestException;
import com.omnicharge.common.exception.ResourceNotFoundException;
import com.omnicharge.notification.dto.NotificationResponse;
import com.omnicharge.notification.entity.Notification;
import com.omnicharge.notification.entity.NotificationCategory;
import com.omnicharge.notification.entity.NotificationStatus;
import com.omnicharge.notification.entity.NotificationType;
import com.omnicharge.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NotificationServiceCoverageTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private IEmailService emailService;
    @Mock
    private ISmsService smsService;
    @Mock
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;

    private NotificationService notificationService;
    private Notification sampleNotification;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        notificationService = new NotificationService(
                notificationRepository,
                emailService,
                smsService,
                logEventPublisher
        );

        sampleNotification = new Notification();
        sampleNotification.setId(1L);
        sampleNotification.setUserId(10L);
        sampleNotification.setType(NotificationType.EMAIL);
        sampleNotification.setCategory(NotificationCategory.PAYMENT_SUCCESS);
        sampleNotification.setStatus(NotificationStatus.PENDING);
    }


    @Test
    void getUserNotifications_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        when(notificationRepository.findByUserId(10L, pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        notificationService.getUserNotifications(10L, pageable);
        verify(notificationRepository).findByUserId(10L, pageable);
    }

    @Test
    void createAndSendEmail_DatabaseError_ThrowsException() {
        when(notificationRepository.save(any())).thenThrow(new RuntimeException("DB Outage"));
        
        assertThrows(RuntimeException.class, () -> 
            notificationService.createAndSendEmail(10L, "test@test.com", "Sub", "Body", NotificationCategory.PAYMENT_SUCCESS, "REF")
        );
    }

    @Test
    void createAndSendSms_SmsFailure_StillSavesAsFailed() {
        doThrow(new RuntimeException("SMS Provider Down")).when(smsService).sendSms(anyString(), anyString());
        when(notificationRepository.save(any())).thenReturn(sampleNotification);

        notificationService.createAndSendSms(10L, "9876543210", "Msg", NotificationCategory.PAYMENT_SUCCESS, "REF");

        verify(notificationRepository).save(argThat(n -> n.getStatus() == NotificationStatus.FAILED));
    }

    @Test
    void createAndSendSms_DatabaseError_ThrowsException() {
        when(notificationRepository.save(any())).thenThrow(new RuntimeException("DB Outage"));
        
        assertThrows(RuntimeException.class, () -> 
            notificationService.createAndSendSms(10L, "9876543210", "Msg", NotificationCategory.PAYMENT_SUCCESS, "REF")
        );
    }

    @Test
    void markAsRead_NotFound_ThrowsException() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> notificationService.markAsRead(1L, 10L));
    }

    @Test
    void markAsRead_Unauthorized_ThrowsException() {
        sampleNotification.setUserId(99L); // Different from 10L
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(sampleNotification));
        assertThrows(BadRequestException.class, () -> notificationService.markAsRead(1L, 10L));
    }

    @Test
    void getUnreadCount_ReturnsCount() {
        when(notificationRepository.countByUserIdAndIsRead(10L, false)).thenReturn(5L);
        assertEquals(5L, notificationService.getUnreadCount(10L));
    }

    @Test
    void getAllNotifications_ReturnsPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(notificationRepository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(sampleNotification)));
        Page<NotificationResponse> result = notificationService.getAllNotifications(pageable);
        assertEquals(1, result.getTotalElements());
    }

    @Test
    void publishBusinessLog_PublishError_DoesNotThrow() {
        // We need to trigger createAndSendEmail to hit publishBusinessLog
        when(notificationRepository.save(any())).thenReturn(sampleNotification);
        doThrow(new RuntimeException("Publisher Error")).when(logEventPublisher).publish(any());

        assertDoesNotThrow(() -> 
            notificationService.createAndSendEmail(10L, "test@test.com", "Sub", "Body", NotificationCategory.PAYMENT_SUCCESS, "REF")
        );
        // Should catch the error and log it, not throw it
    }
}
