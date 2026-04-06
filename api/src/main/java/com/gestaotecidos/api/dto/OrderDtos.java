package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.OrderStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

public interface OrderDtos {

    record Request(
            @NotNull Long clientId,
            @NotNull Long sellerId,
            @NotNull OrderStatus status,
            @NotEmpty List<OrderItemRequest> items
    ) {}

    record OrderItemRequest(
            @NotNull Long productId,
            @NotNull @Positive BigDecimal quantity,
            @NotNull @Positive BigDecimal unitPrice
    ) {}

    record Response(
            Long id,
            Long clientId,
            String clientName,
            Long sellerId,
            String sellerName,
            OrderStatus status,
            BigDecimal totalAmount,
            List<OrderItemResponse> items
    ) {}

    record OrderItemResponse(
            Long id,
            Long productId,
            String productName,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal subTotal
    ) {}
}