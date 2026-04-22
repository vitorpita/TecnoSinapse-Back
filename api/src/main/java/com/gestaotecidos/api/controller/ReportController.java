package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.ReportDtos;
import com.gestaotecidos.api.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<ReportDtos.TransactionResponse>> getTransactions(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(service.getTransactions(from, to));
    }

    @GetMapping("/stock-inventory")
    @PreAuthorize("hasAuthority('product:read')")
    public ResponseEntity<List<ReportDtos.StockInventoryItem>> getStockInventory() {
        return ResponseEntity.ok(service.getStockInventory());
    }

    @GetMapping("/top-products")
    @PreAuthorize("hasAuthority('product:read')")
    public ResponseEntity<List<ReportDtos.TopProductItem>> getTopProducts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(service.getTopProducts(from, to));
    }

    @GetMapping("/cash-closing/{cashRegisterId}")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<ReportDtos.CashClosingResponse> getCashClosing(@PathVariable Long cashRegisterId) {
        return ResponseEntity.ok(service.getCashClosing(cashRegisterId));
    }

    @GetMapping("/sales-rank")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<ReportDtos.SalesRankItem>> getSalesRank(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(service.getSalesRank(from, to));
    }

    @GetMapping("/stock-movements")
    @PreAuthorize("hasAuthority('product:read')")
    public ResponseEntity<List<ReportDtos.StockMovementHistoryItem>> getStockMovements(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(service.getStockMovementHistory(from, to));
    }
}