package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.PaymentMethod;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface PaymentDtos {

    record Request(
            @NotNull Long orderId,
            @NotNull PaymentMethod paymentMethod,
            @NotNull @Positive BigDecimal amount,
            @NotNull @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime paidAt,
            Long installmentId,
            String transactionCode,
            String observation
    ) {}

    record Response(
            Long id,
            PaymentMethod paymentMethod,
            BigDecimal amount,
            LocalDateTime paidAt,
            String transactionCode,
            String observation,
            LocalDateTime createdAt,
            Long orderId,
            String orderStatus,
            Long clientId,
            String clientName,
            String clientDocument,
            String clientEmail,
            String clientPhone,
            BigDecimal totalOrderAmount,
            BigDecimal totalPaid,
            BigDecimal pending,
            String paymentStatus
    ) {}
}
