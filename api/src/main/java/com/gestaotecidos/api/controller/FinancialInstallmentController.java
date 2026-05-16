package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.FinancialInstallmentDtos;
import com.gestaotecidos.api.service.FinancialInstallmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/financial/installments")
public class FinancialInstallmentController {

    private final FinancialInstallmentService service;

    public FinancialInstallmentController(FinancialInstallmentService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<FinancialInstallmentDtos.Response>> listAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<FinancialInstallmentDtos.Response>> listPending() {
        return ResponseEntity.ok(service.findPending());
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<FinancialInstallmentDtos.Response>> listByOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(service.findByOrder(orderId));
    }
}
