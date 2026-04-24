package com.omnicharge.payment.controller;

import com.omnicharge.common.dto.ApiResponse;
import com.omnicharge.payment.dto.OrderRequest;
import com.omnicharge.payment.dto.OrderResponse;
import com.omnicharge.payment.dto.PaymentVerificationRequest;
import com.omnicharge.payment.service.DirectRazorpayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class DirectRazorpayController {

    private final DirectRazorpayService razorpayService;

    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(@RequestBody OrderRequest request) {
        OrderResponse response = razorpayService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Order created successfully", response));
    }

    @PostMapping("/verify-payment")
    public ResponseEntity<ApiResponse<String>> verifyPayment(@RequestBody PaymentVerificationRequest request) {
        boolean isVerified = razorpayService.verifyPayment(request);
        
        if (isVerified) {
            return ResponseEntity.ok(ApiResponse.success("Payment verified successfully", "SUCCESS"));
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Payment verification failed"));
        }
    }
}
