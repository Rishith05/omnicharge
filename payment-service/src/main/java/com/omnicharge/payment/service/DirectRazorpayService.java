package com.omnicharge.payment.service;

import com.omnicharge.payment.dto.OrderRequest;
import com.omnicharge.payment.dto.OrderResponse;
import com.omnicharge.payment.dto.PaymentVerificationRequest;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Slf4j
@Service
public class DirectRazorpayService {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    public OrderResponse createOrder(OrderRequest request) {
        try {
            RazorpayClient razorpayClient = new RazorpayClient(keyId, keySecret);
            
            int amountInPaise = request.getAmount().multiply(new BigDecimal("100")).intValue();
            
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", request.getCurrency());
            orderRequest.put("receipt", "txn_" + System.currentTimeMillis());
            
            Order order = razorpayClient.orders.create(orderRequest);
            String orderId = order.get("id");
            
            log.info("Successfully created Razorpay order: {}", orderId);

            return OrderResponse.builder()
                    .orderId(orderId)
                    .amount(amountInPaise)
                    .currency(order.get("currency"))
                    .build();

        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay Order", e);
            throw new RuntimeException("Error communicating with Razorpay: " + e.getMessage());
        }
    }

    public boolean verifyPayment(PaymentVerificationRequest request) {
        try {
            String payload = request.getRazorpayOrderId() + "|" + request.getRazorpayPaymentId();
            boolean isValidSignature = Utils.verifySignature(payload, request.getRazorpaySignature(), keySecret);
            
            if (isValidSignature) {
                log.info("Payment signature verified securely for order: {}", request.getRazorpayOrderId());
            } else {
                log.warn("Payment signature verification FAILED for order: {}", request.getRazorpayOrderId());
            }
            return isValidSignature;
            
        } catch (RazorpayException e) {
            log.error("Exception while verifying signature", e);
            return false;
        }
    }
}
