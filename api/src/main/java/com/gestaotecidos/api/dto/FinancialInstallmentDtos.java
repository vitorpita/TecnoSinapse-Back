package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.InstallmentStatus;
import com.gestaotecidos.api.domain.Enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public interface FinancialInstallmentDtos {

    record Response(
            Long id,
            Long orderId,
            String clientName,
            int installmentNumber,
            int totalInstallments,
            LocalDate dueDate,
            BigDecimal amount,
            InstallmentStatus status,
            PaymentMethod paymentMethod,
            Long paymentId,
            LocalDateTime paidAt,
            LocalDateTime createdAt
    ) {}
}
