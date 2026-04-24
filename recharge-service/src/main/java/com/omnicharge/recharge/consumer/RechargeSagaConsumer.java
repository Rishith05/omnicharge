package com.omnicharge.recharge.consumer;

import com.omnicharge.common.event.saga.PaymentApprovedEvent;
import com.omnicharge.common.event.saga.PaymentRejectedEvent;
import com.omnicharge.recharge.service.IRechargeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class RechargeSagaConsumer {

    private final IRechargeService rechargeService;

    @RabbitListener(queues = "saga.recharge.approved")
    public void consumePaymentApprovedEvent(PaymentApprovedEvent event) {
        log.info("Saga Orchestrator: Consumed PaymentApprovedEvent for rechargeId: {}", event.getRechargeId());
        rechargeService.handlePaymentApproved(event);
    }

    @RabbitListener(queues = "saga.recharge.rejected")
    public void consumePaymentRejectedEvent(PaymentRejectedEvent event) {
        log.info("Saga Orchestrator: Consumed PaymentRejectedEvent for rechargeId: {}", event.getRechargeId());
        rechargeService.handlePaymentRejected(event);
    }
}
