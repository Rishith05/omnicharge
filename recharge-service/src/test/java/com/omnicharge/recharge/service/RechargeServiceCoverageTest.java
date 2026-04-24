package com.omnicharge.recharge.service;

import com.omnicharge.common.dto.ApiResponse;
import com.omnicharge.common.event.saga.PaymentApprovedEvent;
import com.omnicharge.common.event.saga.PaymentRejectedEvent;
import com.omnicharge.common.exception.BadRequestException;
import com.omnicharge.common.exception.ResourceNotFoundException;
import com.omnicharge.recharge.client.OperatorServiceClient;
import com.omnicharge.recharge.client.UserServiceClient;
import com.omnicharge.recharge.dto.*;
import com.omnicharge.recharge.entity.Recharge;
import com.omnicharge.recharge.entity.RechargeStatus;
import com.omnicharge.recharge.messaging.RechargeEventProducer;
import com.omnicharge.recharge.repository.RechargeRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RechargeServiceCoverageTest {

    @Mock
    private RechargeRepository rechargeRepository;
    @Mock
    private OperatorServiceClient operatorServiceClient;
    @Mock
    private UserServiceClient userServiceClient;
    @Mock
    private RechargeEventProducer rechargeEventProducer;
    @Mock
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;

    private RechargeService rechargeService;
    private Recharge sampleRecharge;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        rechargeService = new RechargeService(
                rechargeRepository,
                operatorServiceClient,
                userServiceClient,
                rechargeEventProducer,
                logEventPublisher
        );

        sampleRecharge = new Recharge();
        sampleRecharge.setId(1L);
        sampleRecharge.setRechargeId("RECH-123");
        sampleRecharge.setUserId(10L);
        sampleRecharge.setAmount(new BigDecimal("199.00"));
        sampleRecharge.setStatus(RechargeStatus.SUCCESS);
        sampleRecharge.setCreatedDate(LocalDateTime.now());
        sampleRecharge.setPlanExpiryDate(LocalDate.now().plusDays(30));
    }

    @Test
    void getRechargeHistory_ReturnsPage() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Recharge> page = new PageImpl<>(List.of(sampleRecharge));
        when(rechargeRepository.findByUserId(10L, pageable)).thenReturn(page);

        Page<RechargeResponse> result = rechargeService.getRechargeHistory(10L, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("RECH-123", result.getContent().get(0).getRechargeId());
    }

    @Test
    void getRechargeStatus_Found_ReturnsString() {
        when(rechargeRepository.findByRechargeId("RECH-123")).thenReturn(Optional.of(sampleRecharge));
        String status = rechargeService.getRechargeStatus("RECH-123");
        assertEquals("SUCCESS", status);
    }

    @Test
    void getRechargeStatus_NotFound_ThrowsException() {
        when(rechargeRepository.findByRechargeId(anyString())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> rechargeService.getRechargeStatus("MISSING"));
    }

    @Test
    void getAllRecharges_ReturnsPage() {
        Pageable pageable = PageRequest.of(0, 10);
        when(rechargeRepository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(sampleRecharge)));
        Page<RechargeResponse> result = rechargeService.getAllRecharges(pageable);
        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getRechargeStats_CalculatesCorrectly() {
        when(rechargeRepository.count()).thenReturn(10L);
        when(rechargeRepository.countByStatus(RechargeStatus.SUCCESS)).thenReturn(7L);
        when(rechargeRepository.countByStatus(RechargeStatus.FAILED)).thenReturn(3L);
        when(rechargeRepository.findByCreatedDateBetween(any(), any())).thenReturn(List.of(sampleRecharge));

        RechargeStatsResponse stats = rechargeService.getRechargeStats();

        assertEquals(10L, stats.getTotalRecharges());
        assertEquals(7L, stats.getSuccessCount());
        assertEquals(3L, stats.getFailedCount());
        assertEquals(new BigDecimal("199.00"), stats.getTotalAmount());
    }

    @Test
    void getExpiredToday_ReturnsList() {
        when(rechargeRepository.findByStatusAndPlanExpiryDate(eq(RechargeStatus.SUCCESS), any(LocalDate.class)))
                .thenReturn(List.of(sampleRecharge));
        when(userServiceClient.getUserById(10L)).thenReturn(ApiResponse.success("OK", new UserProfileResponse()));

        List<ExpiringRechargeResponse> result = rechargeService.getExpiredToday();

        assertFalse(result.isEmpty());
    }

    @Test
    void markAsExpired_UpdatesStatus() {
        when(rechargeRepository.findByRechargeId("RECH-123")).thenReturn(Optional.of(sampleRecharge));
        assertDoesNotThrow(() -> rechargeService.markAsExpired("RECH-123"));
        assertEquals(RechargeStatus.EXPIRED, sampleRecharge.getStatus());
        verify(rechargeRepository).save(sampleRecharge);
    }

    @Test
    void handlePaymentApproved_ValidEvent_UpdatesRecharge() {
        PaymentApprovedEvent event = PaymentApprovedEvent.builder()
                .rechargeId("RECH-123")
                .transactionId("TXN-OK")
                .build();
        sampleRecharge.setStatus(RechargeStatus.PROCESSING);
        
        when(rechargeRepository.findByRechargeId("RECH-123")).thenReturn(Optional.of(sampleRecharge));
        when(userServiceClient.getUserById(10L)).thenReturn(ApiResponse.success("OK", new UserProfileResponse()));

        rechargeService.handlePaymentApproved(event);

        assertEquals(RechargeStatus.SUCCESS, sampleRecharge.getStatus());
        assertEquals("TXN-OK", sampleRecharge.getTransactionId());
        verify(rechargeEventProducer).publishRechargeCompleted(any());
    }

    @Test
    void handlePaymentRejected_ValidEvent_UpdatesStatusAndReason() {
        PaymentRejectedEvent event = PaymentRejectedEvent.builder()
                .rechargeId("RECH-123")
                .failureReason("Declined by bank")
                .build();
        sampleRecharge.setStatus(RechargeStatus.PROCESSING);

        when(rechargeRepository.findByRechargeId("RECH-123")).thenReturn(Optional.of(sampleRecharge));

        rechargeService.handlePaymentRejected(event);

        assertEquals(RechargeStatus.FAILED, sampleRecharge.getStatus());
        assertEquals("Declined by bank", sampleRecharge.getFailureReason());
    }

    @Test
    void handlePaymentRejected_LongReason_TruncatesSuccessfully() {
        String longReason = "A".repeat(600);
        PaymentRejectedEvent event = PaymentRejectedEvent.builder()
                .rechargeId("RECH-123")
                .failureReason(longReason)
                .build();
        
        when(rechargeRepository.findByRechargeId("RECH-123")).thenReturn(Optional.of(sampleRecharge));

        rechargeService.handlePaymentRejected(event);

        assertTrue(sampleRecharge.getFailureReason().length() <= 500);
        assertTrue(sampleRecharge.getFailureReason().endsWith("..."));
    }

    @Test
    void getRechargeByIdInternal_Found_ReturnsResponse() {
        when(rechargeRepository.findByRechargeId("RECH-123")).thenReturn(Optional.of(sampleRecharge));
        RechargeResponse response = rechargeService.getRechargeByIdInternal("RECH-123");
        assertNotNull(response);
    }

    @Test
    void getRechargeByIdInternal_NotFound_ReturnsNull() {
        when(rechargeRepository.findByRechargeId("MISSING")).thenReturn(Optional.empty());
        assertNull(rechargeService.getRechargeByIdInternal("MISSING"));
    }

    @Test
    void mapToExpiringResponse_UserApiError_StillReturnsPartialResponse() {
        when(rechargeRepository.findByStatusAndPlanExpiryDate(eq(RechargeStatus.SUCCESS), any(LocalDate.class)))
                .thenReturn(List.of(sampleRecharge));
        when(userServiceClient.getUserById(10L)).thenThrow(new RuntimeException("Network Error"));

        List<ExpiringRechargeResponse> result = rechargeService.getExpiredToday();

        assertNotNull(result.get(0));
        assertNull(result.get(0).getUserEmail());
    }
}
