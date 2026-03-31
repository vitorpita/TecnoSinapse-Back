package com.gestaotecidos.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public interface ProductDtos {
    record Request(
            @NotBlank String name,
            String sku,
            String color,
            String composition,
            Integer weightGsm,
            BigDecimal width,
            @NotNull BigDecimal stockQuantity,
            @NotNull BigDecimal unitPrice,
            @NotNull BigDecimal purchasePrice,
            @NotNull Long categoryId,
            @NotNull Long providerId
    ) {}

    record Response(
            Long id,
            String name,
            String sku,
            BigDecimal stockQuantity,
            String categoryName
    ) {}
}