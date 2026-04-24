package com.omnicharge.payment.dto;

import lombok.Data;

@Data
public class PaymentVerificationRequest {
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    private String rechargeId;
    private java.math.BigDecimal amount;
}
