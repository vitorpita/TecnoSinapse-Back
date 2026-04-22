package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.CashMovementType;
import com.gestaotecidos.api.domain.Enums.StockMovementType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface ReportDtos {

    record TransactionResponse(
            Long id,
            String type,
            BigDecimal amount,
            String description,
            String relatedEntity,
            Long relatedId,
            LocalDateTime createdAt
    ) {}

    record StockInventoryItem(
            Long productId,
            String productName,
            String sku,
            String categoryName,
            BigDecimal stockQuantity,
            BigDecimal unitPrice,
            BigDecimal purchasePrice,
            BigDecimal totalValueSale,
            BigDecimal totalValueCost
    ) {}

    record TopProductItem(
            Long productId,
            String productName,
            String sku,
            BigDecimal totalQuantitySold,
            BigDecimal totalRevenue,
            Long orderCount
    ) {}

    record CashClosingResponse(
            Long cashRegisterId,
            String openedByName,
            String closedByName,
            LocalDateTime openedAt,
            LocalDateTime closedAt,
            BigDecimal openingBalance,
            BigDecimal closingBalance,
            BigDecimal totalEntries,
            BigDecimal totalExits,
            BigDecimal totalSales,
            BigDecimal expectedBalance,
            BigDecimal difference,
            List<CashMovementSummary> movementSummary
    ) {}

    record CashMovementSummary(
            CashMovementType type,
            BigDecimal total,
            Long count
    ) {}

    record SalesRankItem(
            Long sellerId,
            String sellerName,
            Long totalOrders,
            BigDecimal totalRevenue,
            BigDecimal averageOrderValue
    ) {}

    record StockMovementHistoryItem(
            Long id,
            Long productId,
            String productName,
            StockMovementType type,
            BigDecimal quantity,
            String reason,
            LocalDateTime createdAt
    ) {}
}