package com.omnicharge.payment.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderResponse {
    private String orderId;
    private Integer amount;
    private String currency;
}
