package com.omnicharge.payment.service;

import com.omnicharge.common.event.PaymentCompletedEvent;
import com.omnicharge.common.event.saga.PaymentApprovedEvent;
import com.omnicharge.common.exception.BadRequestException;
import com.omnicharge.common.exception.ResourceNotFoundException;
import com.omnicharge.common.logging.LogEventPublisher;
import com.omnicharge.payment.dto.*;
import com.omnicharge.payment.entity.PaymentMethod;
import com.omnicharge.payment.entity.PaymentStatus;
import com.omnicharge.payment.entity.Transaction;
import com.omnicharge.payment.messaging.PaymentEventProducer;
import com.omnicharge.payment.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private IRazorpayPaymentService razorpayPaymentService;

    @Mock
    private PaymentEventProducer paymentEventProducer;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Mock
    private LogEventPublisher logEventPublisher;

    @InjectMocks
    private PaymentService paymentService;

    private PaymentRequest paymentRequest;
    private Transaction pendingTransaction;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(
            transactionRepository,
            razorpayPaymentService,
            paymentEventProducer,
            restTemplate,
            logEventPublisher,
            jdbcTemplate
        );

        paymentRequest = new PaymentRequest();
        paymentRequest.setRechargeId("OMNI-1234");
        paymentRequest.setUserId(1L);
        paymentRequest.setAmount(new BigDecimal("299.00"));
        paymentRequest.setPaymentMethod("CREDIT_CARD");
        paymentRequest.setUserEmail("test@test.com");
        paymentRequest.setUserMobile("9876543210");
        paymentRequest.setMobileNumber("9876543210");
        paymentRequest.setOperatorName("Jio");
        paymentRequest.setPlanName("Ultimate 5G");

        pendingTransaction = new Transaction();
        pendingTransaction.setId(100L);
        pendingTransaction.setTransactionId("TXN-XXXXXX");
        pendingTransaction.setRechargeId("OMNI-1234");
        pendingTransaction.setUserId(1L);
        pendingTransaction.setAmount(new BigDecimal("299.00"));
        pendingTransaction.setPaymentMethod(PaymentMethod.CREDIT_CARD);
        pendingTransaction.setStatus(PaymentStatus.PENDING);
        pendingTransaction.setUserEmail("test@test.com");
    }

    @Test
    void processPayment_ReturnsSuccess() {
        PaymentResponse mockResponse = PaymentResponse.builder()
                .status("SUCCESS")
                .razorpayOrderId("order_123")
                .amount(new BigDecimal("299.00"))
                .build();

        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> {
            Transaction t = invocation.getArgument(0);
            t.setId(1L);
            return t;
        });

        when(razorpayPaymentService.processRazorpayPayment(any(PaymentRequest.class))).thenReturn(mockResponse);

        PaymentResponse response = paymentService.processPayment(paymentRequest);

        assertNotNull(response);
        assertEquals("SUCCESS", response.getStatus());
        assertEquals("order_123", response.getRazorpayOrderId());
        verify(transactionRepository, times(2)).save(any(Transaction.class));
        verify(paymentEventProducer, times(1)).publishPaymentCompleted(any(PaymentCompletedEvent.class));
    }

    @Test
    void processPayment_ReturnsPending() {
        PaymentResponse mockResponse = PaymentResponse.builder()
                .status("PENDING")
                .razorpayOrderId("order_999")
                .build();

        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(razorpayPaymentService.processRazorpayPayment(any(PaymentRequest.class))).thenReturn(mockResponse);

        PaymentResponse response = paymentService.processPayment(paymentRequest);

        assertEquals("PENDING", response.getStatus());
        verify(transactionRepository, times(2)).save(any(Transaction.class));
        // Should NOT publish completed event for PENDING
        verify(paymentEventProducer, never()).publishPaymentCompleted(any());
    }

    @Test
    void processPayment_ReturnsFailed() {
        PaymentResponse mockResponse = PaymentResponse.builder().status("FAILED").build();

        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(razorpayPaymentService.processRazorpayPayment(any(PaymentRequest.class))).thenReturn(mockResponse);

        PaymentResponse response = paymentService.processPayment(paymentRequest);

        assertEquals("FAILED", response.getStatus());
        verify(paymentEventProducer, times(1)).publishPaymentCompleted(any(PaymentCompletedEvent.class));
    }

    @Test
    void confirmPayment_Success() {
        when(transactionRepository.findByTransactionId("TXN-XXXXXX")).thenReturn(Optional.of(pendingTransaction));
        when(transactionRepository.save(any(Transaction.class))).thenReturn(pendingTransaction);

        TransactionResponse response = paymentService.confirmPayment("TXN-XXXXXX", "rzp_999", "sig_999");

        assertEquals(PaymentStatus.SUCCESS, response.getStatus());
        verify(paymentEventProducer, times(1)).publishPaymentApproved(any(PaymentApprovedEvent.class));
        verify(paymentEventProducer, times(1)).publishPaymentCompleted(any(PaymentCompletedEvent.class));
    }

    @Test
    void confirmPayment_AlreadyConfirmed() {
        pendingTransaction.setStatus(PaymentStatus.SUCCESS);
        when(transactionRepository.findByTransactionId("TXN-XXXXXX")).thenReturn(Optional.of(pendingTransaction));

        TransactionResponse response = paymentService.confirmPayment("TXN-XXXXXX", "rzp_999", "sig_999");

        assertEquals(PaymentStatus.SUCCESS, response.getStatus());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void confirmPayment_MissingMetadata_FetchesFromRechargeService() {
        // Remove metadata
        pendingTransaction.setMobileNumber(null);
        pendingTransaction.setOperatorName(null);
        pendingTransaction.setPlanName(null);

        when(transactionRepository.findByTransactionId("TXN-XXXXXX")).thenReturn(Optional.of(pendingTransaction));
        when(transactionRepository.save(any(Transaction.class))).thenReturn(pendingTransaction);

        // Mock RestTemplate response
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        Map<String, Object> data = new HashMap<>();
        data.put("mobileNumber", "1234567890");
        data.put("operatorName", "MockOperator");
        data.put("planName", "MockPlan");
        body.put("data", data);

        ResponseEntity<Map<String, Object>> responseEntity = ResponseEntity.ok(body);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), isNull(), any(ParameterizedTypeReference.class)))
                .thenReturn(responseEntity);

        paymentService.confirmPayment("TXN-XXXXXX", "rzp_999", "sig_999");

        assertEquals("1234567890", pendingTransaction.getMobileNumber());
        assertEquals("MockOperator", pendingTransaction.getOperatorName());
        assertEquals("MockPlan", pendingTransaction.getPlanName());
        verify(restTemplate, times(1)).exchange(anyString(), any(), any(), any(ParameterizedTypeReference.class));
    }

    @Test
    void init_DropsConstraint() {
        paymentService.init();
        verify(jdbcTemplate).execute(anyString());
    }

    @Test
    void init_HandlesException() {
        doThrow(new RuntimeException("DB error")).when(jdbcTemplate).execute(anyString());
        assertDoesNotThrow(() -> paymentService.init());
    }

    @Test
    void confirmPayment_EnrichmentFailure() {
        pendingTransaction.setMobileNumber(null);
        when(transactionRepository.findByTransactionId(anyString())).thenReturn(Optional.of(pendingTransaction));
        when(transactionRepository.save(any())).thenReturn(pendingTransaction);
        when(restTemplate.exchange(anyString(), any(), any(), any(ParameterizedTypeReference.class)))
                .thenThrow(new RuntimeException("API error"));
        
        assertDoesNotThrow(() -> paymentService.confirmPayment("ID", "RZP", "SIG"));
    }

    @Test
    void confirmPayment_EnrichmentNoData() {
        pendingTransaction.setMobileNumber(null);
        when(transactionRepository.findByTransactionId(anyString())).thenReturn(Optional.of(pendingTransaction));
        when(transactionRepository.save(any())).thenReturn(pendingTransaction);
        when(restTemplate.exchange(anyString(), any(), any(), any(ParameterizedTypeReference.class)))
                .thenReturn(ResponseEntity.ok(Map.of("success", false)));
        
        assertDoesNotThrow(() -> paymentService.confirmPayment("ID", "RZP", "SIG"));
    }

    @Test
    void getPaymentStats_FullMapping() {
        Object[] revRow = new Object[]{"2024-01-01", 5L, new BigDecimal("1000")};
        List<Object[]> revenueData = java.util.Collections.singletonList(revRow);
        
        Object[] userRow = new Object[]{1L, 3L, new BigDecimal("600")};
        List<Object[]> topUsersData = java.util.Collections.singletonList(userRow);
        
        doReturn(revenueData).when(transactionRepository).findRevenueByDate(any(), any());
        doReturn(topUsersData).when(transactionRepository).findTopUsersByRevenue(any(), any());
        when(transactionRepository.sumAmountByStatus(any())).thenReturn(new BigDecimal("1000"));
        
        PaymentStatsResponse stats = paymentService.getPaymentStats(30);
        
        assertEquals(1, stats.getRevenueByDate().size());
        assertEquals(new BigDecimal("1000"), stats.getRevenueByDate().get(0).getRevenue());
        assertEquals(1, stats.getTopUsers().size());
        assertEquals(1L, stats.getTopUsers().get(0).getUserId());
    }

    @Test
    void publishEvent_ExceptionHandled() {
        doThrow(new RuntimeException("Rabbit error")).when(paymentEventProducer).publishPaymentCompleted(any());
        PaymentResponse mockResponse = PaymentResponse.builder().status("SUCCESS").build();
        when(transactionRepository.save(any())).thenReturn(pendingTransaction);
        when(razorpayPaymentService.processRazorpayPayment(any())).thenReturn(mockResponse);
        
        assertDoesNotThrow(() -> paymentService.processPayment(paymentRequest));
    }
}
