package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.StockMovementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface StockMovementDtos {

    record Request(
            @NotNull Long productId,
            @NotNull StockMovementType type,
            @NotNull @Positive BigDecimal quantity,
            @NotBlank String reason
    ) {}

    record Response(
            Long id,
            Long productId,
            String productName,
            StockMovementType type,
            BigDecimal quantity,
            String reason,
            Long referenceId,
            String referenceType,
            Long createdBy,
            LocalDateTime createdAt
    ) {}
}