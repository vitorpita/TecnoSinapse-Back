package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.CashMovementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface CashRegisterDtos {

    record OpenRequest(
            @NotNull @PositiveOrZero BigDecimal openingBalance,
            String observation
    ) {}

    record CloseRequest(
            @NotNull @PositiveOrZero BigDecimal closingBalance,
            String observation
    ) {}

    record MovementRequest(
            @NotNull CashMovementType type,
            @NotNull @Positive BigDecimal amount,
            @NotBlank String description,
            Long orderId
    ) {}

    record Response(
            Long id,
            Long openedById,
            String openedByName,
            Long closedById,
            String closedByName,
            BigDecimal openingBalance,
            BigDecimal closingBalance,
            LocalDateTime openedAt,
            LocalDateTime closedAt,
            String observation,
            boolean closed,
            BigDecimal totalIn,
            BigDecimal totalOut,
            BigDecimal totalSangrias,
            BigDecimal totalSuprimentos,
            BigDecimal expectedBalance,
            BigDecimal balanceDifference,
            List<MovementResponse> movements
    ) {}

    record MovementResponse(
            Long id,
            CashMovementType type,
            BigDecimal amount,
            String description,
            Long orderId,
            Long paymentId,
            LocalDateTime createdAt
    ) {}

    record PeriodSummary(
            BigDecimal totalIn,
            BigDecimal totalOut,
            BigDecimal net,
            long movementCount
    ) {}
}
