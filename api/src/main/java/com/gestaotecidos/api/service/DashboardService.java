package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Order;
import com.gestaotecidos.api.domain.Enums.OrderStatus;
import com.gestaotecidos.api.dto.DashboardDtos;
import com.gestaotecidos.api.repository.OrderRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public DashboardService(OrderRepository orderRepository,
                            ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }


    @Transactional(readOnly = true)
    public DashboardDtos.StatsResponse getStats() {
        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDateTime startOfDayDateTime = today.atStartOfDay();
        LocalDateTime endOfDayDateTime = today.atTime(LocalTime.MAX);
        LocalDateTime startOfMonthDateTime = startOfMonth.atStartOfDay();
        LocalDateTime endOfMonthDateTime = today.atTime(LocalTime.MAX);

        List<Order> ordersMonth = orderRepository.findAll(Pageable.unpaged())
                .stream()
                .filter(o -> o.isActive()
                        && !o.getStatus().equals(OrderStatus.CANCELADO)
                        && !o.getCreatedAt().isBefore(startOfMonthDateTime)
                        && !o.getCreatedAt().isAfter(endOfMonthDateTime))
                .collect(Collectors.toList());

        List<Order> ordersDay = ordersMonth.stream()
                .filter(o -> !o.getCreatedAt().isBefore(startOfDayDateTime)
                        && !o.getCreatedAt().isAfter(endOfDayDateTime))
                .collect(Collectors.toList());

        BigDecimal totalSalesMonth = ordersMonth.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSalesDay = ordersDay.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int ordersCountDay = ordersDay.size();

        BigDecimal averageTicket = ordersMonth.isEmpty()
                ? BigDecimal.ZERO
                : totalSalesMonth.divide(
                BigDecimal.valueOf(ordersMonth.size()),
                2,
                RoundingMode.HALF_UP);

        long activeClients = ordersMonth.stream()
                .map(o -> o.getClient().getId())
                .distinct()
                .count();

        long totalProducts = productRepository.findAll(Pageable.unpaged())
                .getTotalElements();

        BigDecimal totalStock = productRepository.findAll(Pageable.unpaged())
                .stream()
                .map(p -> p.getStockQuantity())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long pendingOrders = ordersMonth.stream()
                .filter(o -> o.getStatus() == OrderStatus.APROVADO || o.getStatus() == OrderStatus.FATURADO)
                .count();

        List<DashboardDtos.SalesByDayResponse> salesByDay = calculateSalesByDay(ordersMonth);

        return new DashboardDtos.StatsResponse(
                totalSalesMonth.doubleValue(),
                totalSalesDay.doubleValue(),
                (int) ordersCountDay,
                averageTicket.doubleValue(),
                (int) activeClients,
                (int) totalProducts,
                totalStock.intValue(),
                (int) pendingOrders,
                salesByDay
        );
    }

    @Transactional(readOnly = true)
    public List<DashboardDtos.SalesByDayResponse> getSalesTrend() {
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate today = LocalDate.now();
        LocalDateTime startOfMonthDateTime = startOfMonth.atStartOfDay();
        LocalDateTime endOfDayDateTime = today.atTime(LocalTime.MAX);

        List<Order> orders = orderRepository.findAll(Pageable.unpaged())
                .stream()
                .filter(o -> o.isActive()
                        && !o.getStatus().equals(OrderStatus.CANCELADO)
                        && !o.getCreatedAt().isBefore(startOfMonthDateTime)
                        && !o.getCreatedAt().isAfter(endOfDayDateTime))
                .collect(Collectors.toList());

        return calculateSalesByDay(orders);
    }

    private List<DashboardDtos.SalesByDayResponse> calculateSalesByDay(List<Order> orders) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MMM");

        Map<LocalDate, BigDecimal> salesMap = orders.stream()
                .collect(Collectors.groupingBy(
                        order -> order.getCreatedAt().toLocalDate(),
                        Collectors.reducing(
                                BigDecimal.ZERO,
                                Order::getTotalAmount,
                                BigDecimal::add
                        )
                ));

        return salesMap.entrySet().stream()
                .sorted((e1, e2) -> e1.getKey().compareTo(e2.getKey()))
                .map(entry -> new DashboardDtos.SalesByDayResponse(
                        entry.getKey().format(formatter),
                        entry.getValue().doubleValue()
                ))
                .collect(Collectors.toList());
    }
}