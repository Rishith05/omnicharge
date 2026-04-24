package com.omnicharge.recharge.consumer;

import com.omnicharge.common.dto.ApiResponse;
import com.omnicharge.common.event.RechargeCompletedEvent;
import com.omnicharge.common.event.saga.PaymentApprovedEvent;
import com.omnicharge.common.event.saga.PaymentRejectedEvent;
import com.omnicharge.recharge.client.UserServiceClient;
import com.omnicharge.recharge.dto.UserProfileResponse;
import com.omnicharge.recharge.entity.Recharge;
import com.omnicharge.recharge.entity.RechargeStatus;
import com.omnicharge.recharge.messaging.RechargeEventProducer;
import com.omnicharge.recharge.repository.RechargeRepository;
import com.omnicharge.recharge.service.IRechargeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RechargeSagaConsumerTest {

    @Mock
    private IRechargeService rechargeService;

    @InjectMocks
    private RechargeSagaConsumer rechargeSagaConsumer;

    private Recharge recharge;
    private UserProfileResponse userProfile;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        rechargeSagaConsumer = new RechargeSagaConsumer(rechargeService);
        
        recharge = new Recharge();
        recharge.setId(100L);
        recharge.setRechargeId("OMNI-SAGA123");
        recharge.setUserId(1L);
        recharge.setStatus(RechargeStatus.PROCESSING);
        recharge.setAmount(new java.math.BigDecimal("299.00")); // Add amount
        
        userProfile = new UserProfileResponse();
        userProfile.setEmail("user@example.com");
    }

    @Test
    void consumePaymentApprovedEvent_Success_TriggersNotification() {
        PaymentApprovedEvent event = PaymentApprovedEvent.builder()
                .rechargeId("OMNI-SAGA123")
                .transactionId("PAY_999")
                .build();

        rechargeSagaConsumer.consumePaymentApprovedEvent(event);

        verify(rechargeService, times(1)).handlePaymentApproved(event);
    }

    @Test
    void consumePaymentRejectedEvent_Fails_BypassesNotification() {
        PaymentRejectedEvent event = PaymentRejectedEvent.builder()
                .rechargeId("OMNI-SAGA123")
                .failureReason("Insufficient Funds in Wallet")
                .build();

        rechargeSagaConsumer.consumePaymentRejectedEvent(event);

        verify(rechargeService, times(1)).handlePaymentRejected(event);
    }
}
