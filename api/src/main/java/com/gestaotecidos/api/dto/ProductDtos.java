package com.gestaotecidos.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface ProductDtos {

    record Request(
            @NotBlank String name,
            String sku,
            String color,
            String composition,
            Integer weightGsm,
            BigDecimal width,
            String imgUrl,
            @NotNull BigDecimal stockQuantity,
            @NotNull BigDecimal unitPrice,
            @NotNull BigDecimal purchasePrice,
            @NotNull Long categoryId,
            Long providerId
    ) {}

    record Response(
            Long id,
            String name,
            String sku,
            String color,
            String composition,
            Integer weightGsm,
            String imgUrl,
            BigDecimal width,
            BigDecimal stockQuantity,
            BigDecimal unitPrice,
            BigDecimal purchasePrice,
            Long categoryId,
            String categoryName,
            Long providerId,
            boolean active,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}