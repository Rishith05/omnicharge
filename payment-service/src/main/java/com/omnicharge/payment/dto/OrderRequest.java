package com.omnicharge.payment.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class OrderRequest {
    private BigDecimal amount;
    private String currency = "INR";
}
