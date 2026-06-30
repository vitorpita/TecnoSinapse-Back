package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Enums.AuditAction;
import com.gestaotecidos.api.domain.Enums.AuditModule;
import com.gestaotecidos.api.domain.Enums.CashMovementType;
import com.gestaotecidos.api.domain.OrderItem;
import com.gestaotecidos.api.dto.ReportDtos;
import com.gestaotecidos.api.repository.CashRegisterRepository;
import com.gestaotecidos.api.repository.OrderRepository;
import com.gestaotecidos.api.repository.PaymentRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import com.gestaotecidos.api.repository.StockMovementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final CashRegisterRepository cashRegisterRepository;
    private final AuditLogService auditLogService;

    public ReportService(OrderRepository orderRepository,
                         PaymentRepository paymentRepository,
                         ProductRepository productRepository,
                         StockMovementRepository stockMovementRepository,
                         CashRegisterRepository cashRegisterRepository,
                         AuditLogService auditLogService) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.cashRegisterRepository = cashRegisterRepository;
        this.auditLogService = auditLogService;
    }

    public List<ReportDtos.TransactionResponse> getTransactions(LocalDateTime from, LocalDateTime to) {
        auditLogService.log(AuditModule.REPORTS, AuditAction.VIEW, null, "Relatório de transações",
                "Período: " + from + " a " + to);
        var payments = paymentRepository.findByPeriod(from, to).stream()
                .map(p -> new ReportDtos.TransactionResponse(
                        p.getId(),
                        "PAGAMENTO",
                        p.getAmount(),
                        p.getPaymentMethod().name() + (p.getTransactionCode() != null ? " - " + p.getTransactionCode() : ""),
                        "ORDER",
                        p.getOrder().getId(),
                        p.getCreatedAt()
                )).toList();

        var movements = stockMovementRepository.findByPeriod(from, to).stream()
                .map(sm -> new ReportDtos.TransactionResponse(
                        sm.getId(),
                        "MOVIMENTACAO_ESTOQUE",
                        sm.getQuantity(),
                        sm.getType().name() + " - " + sm.getReason(),
                        "PRODUCT",
                        sm.getProduct().getId(),
                        sm.getCreatedAt()
                )).toList();

        return java.util.stream.Stream.concat(payments.stream(), movements.stream())
                .sorted((a, b) -> b.createdAt().compareTo(a.createdAt()))
                .toList();
    }

    public List<ReportDtos.StockInventoryItem> getStockInventory() {
        auditLogService.log(AuditModule.REPORTS, AuditAction.VIEW, null, "Relatório de estoque", null);
        return productRepository.findByActiveTrue(org.springframework.data.domain.Pageable.unpaged())
                .stream()
                .map(p -> new ReportDtos.StockInventoryItem(
                        p.getId(),
                        p.getName(),
                        p.getSku(),
                        p.getCategory() != null ? p.getCategory().getName() : null,
                        p.getStockQuantity(),
                        p.getUnitPrice(),
                        p.getPurchasePrice(),
                        p.getStockQuantity().multiply(p.getUnitPrice()),
                        p.getStockQuantity().multiply(p.getPurchasePrice())
                )).toList();
    }

    @Transactional(readOnly = true)
    public List<ReportDtos.TopProductItem> getTopProducts(LocalDateTime from, LocalDateTime to) {
        auditLogService.log(AuditModule.REPORTS, AuditAction.VIEW, null, "Relatório de produtos mais vendidos",
                "Período: " + from + " a " + to);
        var orders = orderRepository.findAllActive();

        return orders.stream()
                .filter(o -> o.getCreatedAt() != null && !o.getCreatedAt().isBefore(from) && !o.getCreatedAt().isAfter(to))
                .flatMap(o -> o.getItems().stream())
                .collect(Collectors.groupingBy(
                        item -> item.getProduct().getId(),
                        Collectors.toList()
                ))
                .entrySet().stream()
                .map(entry -> {
                    var items = entry.getValue();
                    var product = items.get(0).getProduct();
                    var totalQty = items.stream()
                            .map(OrderItem::getQuantity)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    var totalRevenue = items.stream()
                            .map(OrderItem::getSubTotal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new ReportDtos.TopProductItem(
                            product.getId(),
                            product.getName(),
                            product.getSku(),
                            totalQty,
                            totalRevenue,
                            (long) items.size()
                    );
                })
                .sorted((a, b) -> b.totalQuantitySold().compareTo(a.totalQuantitySold()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ReportDtos.CashClosingResponse getCashClosing(Long cashRegisterId) {
        auditLogService.log(AuditModule.REPORTS, AuditAction.VIEW, cashRegisterId,
                "Relatório de fechamento de caixa", "Caixa #" + cashRegisterId);
        var cashRegister = cashRegisterRepository.findById(cashRegisterId)
                .orElseThrow(() -> new com.gestaotecidos.api.exception.ResourceNotFoundException("Caixa", cashRegisterId));

        var movements = cashRegister.getMovements();

        BigDecimal totalEntries = movements.stream()
                .filter(m -> m.getType() == CashMovementType.ENTRADA || m.getType() == CashMovementType.SUPRIMENTO)
                .map(m -> m.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalExits = movements.stream()
                .filter(m -> m.getType() == CashMovementType.SAIDA || m.getType() == CashMovementType.SANGRIA)
                .map(m -> m.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSales = movements.stream()
                .filter(m -> m.getOrder() != null && m.getType() == CashMovementType.RECEBIMENTO)
                .map(m -> m.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal expectedBalance = cashRegister.getOpeningBalance()
                .add(totalEntries)
                .subtract(totalExits);

        BigDecimal difference = cashRegister.getClosingBalance() != null
                ? cashRegister.getClosingBalance().subtract(expectedBalance)
                : null;

        Map<CashMovementType, List<com.gestaotecidos.api.domain.CashMovement>> grouped =
                movements.stream().collect(Collectors.groupingBy(m -> m.getType()));

        var summary = grouped.entrySet().stream()
                .map(e -> new ReportDtos.CashMovementSummary(
                        e.getKey(),
                        e.getValue().stream().map(m -> m.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add),
                        (long) e.getValue().size()
                )).toList();

        return new ReportDtos.CashClosingResponse(
                cashRegister.getId(),
                cashRegister.getOpenedBy().getName(),
                cashRegister.getClosedBy() != null ? cashRegister.getClosedBy().getName() : null,
                cashRegister.getOpenedAt(),
                cashRegister.getClosedAt(),
                cashRegister.getOpeningBalance(),
                cashRegister.getClosingBalance(),
                totalEntries,
                totalExits,
                totalSales,
                expectedBalance,
                difference,
                summary
        );
    }

    @Transactional(readOnly = true)
    public List<ReportDtos.SalesRankItem> getSalesRank(LocalDateTime from, LocalDateTime to) {
        auditLogService.log(AuditModule.REPORTS, AuditAction.VIEW, null, "Relatório de ranking de vendedores",
                "Período: " + from + " a " + to);
        var orders = orderRepository.findAllActive();

        return orders.stream()
                .filter(o -> o.getCreatedAt() != null && !o.getCreatedAt().isBefore(from) && !o.getCreatedAt().isAfter(to))
                .collect(Collectors.groupingBy(o -> o.getSeller().getId()))
                .entrySet().stream()
                .map(entry -> {
                    var sellerOrders = entry.getValue();
                    var seller = sellerOrders.get(0).getSeller();
                    var totalRevenue = sellerOrders.stream()
                            .map(o -> o.getTotalAmount())
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    var avg = sellerOrders.isEmpty() ? BigDecimal.ZERO
                            : totalRevenue.divide(BigDecimal.valueOf(sellerOrders.size()), 2, RoundingMode.HALF_UP);
                    return new ReportDtos.SalesRankItem(
                            seller.getId(),
                            seller.getName(),
                            (long) sellerOrders.size(),
                            totalRevenue,
                            avg
                    );
                })
                .sorted((a, b) -> b.totalRevenue().compareTo(a.totalRevenue()))
                .toList();
    }

    public List<ReportDtos.StockMovementHistoryItem> getStockMovementHistory(LocalDateTime from, LocalDateTime to) {
        auditLogService.log(AuditModule.REPORTS, AuditAction.VIEW, null, "Relatório de histórico de estoque",
                "Período: " + from + " a " + to);
        return stockMovementRepository.findByPeriod(from, to).stream()
                .map(sm -> new ReportDtos.StockMovementHistoryItem(
                        sm.getId(),
                        sm.getProduct().getId(),
                        sm.getProduct().getName(),
                        sm.getType(),
                        sm.getQuantity(),
                        sm.getReason(),
                        sm.getCreatedAt()
                )).toList();
    }
}