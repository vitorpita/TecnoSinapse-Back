package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.OrderStatus;
import com.gestaotecidos.api.domain.Enums.PaymentMethod;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class OrderDtos {

    public static class Request {
        @NotNull
        public Long clientId;

        @NotNull
        public Long sellerId;

        @NotEmpty
        public List<OrderItemRequest> items;

        public PaymentMethod paymentMethod;

        public String paymentCondition;

        public String observation;

        public Request() {}

        public Long clientId() { return clientId; }
        public Long sellerId() { return sellerId; }
        public List<OrderItemRequest> items() { return items; }
        public PaymentMethod paymentMethod() { return paymentMethod; }
        public String paymentCondition() { return paymentCondition; }
        public String observation() { return observation; }
    }

    public record FaturarRequest(PaymentMethod paymentMethod, String paymentCondition) {}

    public static class OrderItemRequest {
        @NotNull
        public Long productId;

        @NotNull
        @Positive
        public BigDecimal quantity;

        @NotNull
        @Positive
        public BigDecimal unitPrice;

        public OrderItemRequest() {}

        public OrderItemRequest(Long productId, BigDecimal quantity, BigDecimal unitPrice) {
            this.productId = productId;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
        }

        public Long productId() { return productId; }
        public BigDecimal quantity() { return quantity; }
        public BigDecimal unitPrice() { return unitPrice; }
    }

    public static class Response {
        public Long id;
        public Long clientId;
        public String clientName;
        public Long sellerId;
        public String sellerName;
        public OrderStatus status;
        public BigDecimal totalAmount;
        public PaymentMethod paymentMethod;
        public String paymentCondition;
        public String observation;
        public LocalDateTime createdAt;
        public LocalDateTime updatedAt;
        public List<OrderItemResponse> items;

        public Response() {}

        public Response(Long id, Long clientId, String clientName, Long sellerId, String sellerName,
                        OrderStatus status, BigDecimal totalAmount, PaymentMethod paymentMethod,
                        String paymentCondition, String observation,
                        LocalDateTime createdAt, LocalDateTime updatedAt, List<OrderItemResponse> items) {
            this.id = id;
            this.clientId = clientId;
            this.clientName = clientName;
            this.sellerId = sellerId;
            this.sellerName = sellerName;
            this.status = status;
            this.totalAmount = totalAmount;
            this.paymentMethod = paymentMethod;
            this.paymentCondition = paymentCondition;
            this.observation = observation;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
            this.items = items;
        }
    }

    public static class OrderItemResponse {
        public Long id;
        public Long productId;
        public String productName;
        public BigDecimal quantity;
        public BigDecimal unitPrice;
        public BigDecimal subTotal;

        public OrderItemResponse() {}

        public OrderItemResponse(Long id, Long productId, String productName, BigDecimal quantity,
                                 BigDecimal unitPrice, BigDecimal subTotal) {
            this.id = id;
            this.productId = productId;
            this.productName = productName;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
            this.subTotal = subTotal;
        }
    }
}
