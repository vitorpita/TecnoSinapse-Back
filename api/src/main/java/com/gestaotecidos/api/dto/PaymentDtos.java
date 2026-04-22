package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface PaymentDtos {

    record Request(
            @NotNull Long orderId,
            @NotNull PaymentMethod paymentMethod,
            @NotNull @Positive BigDecimal amount,
            @NotNull LocalDateTime paidAt,
            String transactionCode,
            String observation
    ) {}

    record Response(
            Long id,
            Long orderId,
            PaymentMethod paymentMethod,
            BigDecimal amount,
            LocalDateTime paidAt,
            String transactionCode,
            String observation,
            LocalDateTime createdAt
    ) {}
}