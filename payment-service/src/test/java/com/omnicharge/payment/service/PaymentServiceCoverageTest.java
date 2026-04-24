package com.omnicharge.payment.service;

import com.omnicharge.common.exception.BadRequestException;
import com.omnicharge.common.exception.ResourceNotFoundException;
import com.omnicharge.payment.dto.PaymentRequest;
import com.omnicharge.payment.dto.PaymentResponse;
import com.omnicharge.payment.dto.TransactionResponse;
import com.omnicharge.payment.entity.PaymentMethod;
import com.omnicharge.payment.entity.PaymentStatus;
import com.omnicharge.payment.entity.Transaction;
import com.omnicharge.payment.messaging.PaymentEventProducer;
import com.omnicharge.payment.repository.TransactionRepository;
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
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceCoverageTest {

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private IRazorpayPaymentService razorpayPaymentService;
    @Mock
    private PaymentEventProducer paymentEventProducer;
    @Mock
    private RestTemplate restTemplate;
    @Mock
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;
    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private PaymentService paymentService;
    private Transaction sampleTransaction;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        paymentService = new PaymentService(
                transactionRepository,
                razorpayPaymentService,
                paymentEventProducer,
                restTemplate,
                logEventPublisher,
                jdbcTemplate
        );

        sampleTransaction = new Transaction();
        sampleTransaction.setId(1L);
        sampleTransaction.setTransactionId("TXN-123");
        sampleTransaction.setUserId(10L);
        sampleTransaction.setAmount(new BigDecimal("100.00"));
        sampleTransaction.setStatus(PaymentStatus.PENDING);
        sampleTransaction.setPaymentMethod(PaymentMethod.UPI);
    }

    @Test
    void init_HandlesExceptionGracefully() {
        doThrow(new RuntimeException("SQL Error")).when(jdbcTemplate).execute(anyString());
        assertDoesNotThrow(() -> paymentService.init());
        // Should catch and log
    }

    @Test
    void processPayment_RazorpayFailed_UpdatesStatus() {
        PaymentRequest request = new PaymentRequest();
        request.setRechargeId("RECH-1");
        request.setUserId(10L);
        request.setAmount(new BigDecimal("100.00"));
        request.setPaymentMethod("UPI");

        PaymentResponse failedResponse = PaymentResponse.builder()
                .status("FAILED")
                .build();

        when(razorpayPaymentService.processRazorpayPayment(any())).thenReturn(failedResponse);
        when(transactionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        PaymentResponse result = paymentService.processPayment(request);

        assertEquals("FAILED", result.getStatus());
        verify(paymentEventProducer).publishPaymentCompleted(any());
    }

    @Test
    void confirmPayment_NotFound_ThrowsException() {
        when(transactionRepository.findByTransactionId("MISSING")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> paymentService.confirmPayment("MISSING", "P-1", "S-1"));
    }

    @Test
    void confirmPayment_AlreadySuccess_ReturnsResponse() {
        sampleTransaction.setStatus(PaymentStatus.SUCCESS);
        when(transactionRepository.findByTransactionId("TXN-123")).thenReturn(Optional.of(sampleTransaction));
        
        TransactionResponse response = paymentService.confirmPayment("TXN-123", "P-1", "S-1");
        
        assertNotNull(response);
        assertEquals(PaymentStatus.SUCCESS, response.getStatus());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void getTransaction_NotFound_ThrowsException() {
        when(transactionRepository.findByTransactionId("TXN-123")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> paymentService.getTransaction("TXN-123", 10L));
    }

    @Test
    void getTransaction_Unauthorized_ThrowsException() {
        when(transactionRepository.findByTransactionId("TXN-123")).thenReturn(Optional.of(sampleTransaction));
        assertThrows(BadRequestException.class, () -> paymentService.getTransaction("TXN-123", 99L));
    }

    @Test
    void getPaymentStats_NullDays_UsesDefault() {
        when(transactionRepository.findRevenueByDate(any(), any())).thenReturn(Collections.emptyList());
        when(transactionRepository.findTopUsersByRevenue(any(), any())).thenReturn(Collections.emptyList());
        
        assertDoesNotThrow(() -> paymentService.getPaymentStats(null));
        verify(transactionRepository).findRevenueByDate(argThat(d -> d.isBefore(LocalDateTime.now().minusDays(29))), any());
    }

    @Test
    void publishEvent_CatchBlock_DoesNotThrow() {
        // We trigger publishPaymentCompletedEvent via successful processPayment
        PaymentRequest request = new PaymentRequest();
        request.setRechargeId("RECH-1");
        request.setUserId(10L);
        request.setAmount(new BigDecimal("100.00"));
        request.setPaymentMethod("UPI");

        when(razorpayPaymentService.processRazorpayPayment(any())).thenReturn(PaymentResponse.builder().status("SUCCESS").build());
        when(transactionRepository.save(any())).thenReturn(sampleTransaction);
        doThrow(new RuntimeException("RabbitMQ Down")).when(paymentEventProducer).publishPaymentCompleted(any());

        assertDoesNotThrow(() -> paymentService.processPayment(request));
    }

    @Test
    void enrich_Error_HandlesGracefully() {
        // Triggered via confirmPayment when metadata is null
        sampleTransaction.setMobileNumber(null);
        when(transactionRepository.findByTransactionId("TXN-123")).thenReturn(Optional.of(sampleTransaction));
        when(transactionRepository.save(any())).thenReturn(sampleTransaction);
        when(restTemplate.exchange(anyString(), any(), any(), any(org.springframework.core.ParameterizedTypeReference.class)))
                .thenThrow(new RuntimeException("Recharge Service Down"));

        assertDoesNotThrow(() -> paymentService.confirmPayment("TXN-123", "P-1", "S-1"));
        // Should log error and continue
    }
}
