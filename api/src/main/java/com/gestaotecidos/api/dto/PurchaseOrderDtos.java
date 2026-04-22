package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.PurchaseOrderStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface PurchaseOrderDtos {

    record Request(
            @NotNull Long supplierId,
            @NotNull PurchaseOrderStatus status,
            LocalDate expectedDeliveryDate,
            String observation,
            @NotEmpty List<ItemRequest> items
    ) {}

    record ItemRequest(
            @NotNull Long productId,
            @NotNull @Positive BigDecimal quantity,
            @NotNull @Positive BigDecimal unitCost
    ) {}

    record ReceiveRequest(
            @NotEmpty List<ReceiveItemRequest> items
    ) {}

    record ReceiveItemRequest(
            @NotNull Long purchaseOrderItemId,
            @NotNull @Positive BigDecimal receivedQuantity
    ) {}

    record Response(
            Long id,
            Long supplierId,
            String supplierName,
            PurchaseOrderStatus status,
            BigDecimal totalAmount,
            LocalDate expectedDeliveryDate,
            String observation,
            List<ItemResponse> items
    ) {}

    record ItemResponse(
            Long id,
            Long productId,
            String productName,
            BigDecimal quantity,
            BigDecimal receivedQuantity,
            BigDecimal unitCost,
            BigDecimal subTotal
    ) {}
}