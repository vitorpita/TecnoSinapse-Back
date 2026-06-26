package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.FreightType;
import com.gestaotecidos.api.domain.Enums.PurchaseOrderStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface PurchaseOrderDtos {

    record Request(
            @NotNull Long supplierId,
            LocalDate expectedDeliveryDate,
            @NotNull String paymentCondition,
            List<String> paymentMethods,
            FreightType freightType,
            BigDecimal freightCost,
            BigDecimal discount,
            String observation,
            @NotEmpty List<ItemRequest> items
    ) {}

    record ItemRequest(
            @NotNull Long productId,
            @NotNull @Positive BigDecimal quantity,
            @NotNull @Positive BigDecimal unitCost
    ) {}

    record ReceiveRequest(
            String invoiceNumber,
            String observations,
            @NotEmpty List<ItemReceiveRequest> items
    ) {}

    record ItemReceiveRequest(
            @NotNull Long itemId,
            @NotNull @PositiveOrZero BigDecimal receivedQuantity,
            @PositiveOrZero BigDecimal damagedQuantity,
            String damageReason
    ) {}

    record Response(
            Long id,
            Long supplierId,
            String supplierName,
            PurchaseOrderStatus status,
            BigDecimal totalAmount,
            LocalDate expectedDeliveryDate,
            String paymentCondition,
            List<String> paymentMethods,
            FreightType freightType,
            BigDecimal freightCost,
            BigDecimal discount,
            String invoiceNumber,
            String observation,
            LocalDateTime receivedAt,
            LocalDateTime createdAt,
            List<ItemResponse> items
    ) {}

    record ItemResponse(
            Long id,
            Long productId,
            String productName,
            BigDecimal quantity,
            BigDecimal receivedQuantity,
            BigDecimal damagedQuantity,
            BigDecimal pendingQuantity,
            BigDecimal unitCost,
            BigDecimal subTotal,
            String damageReason
    ) {}
}
