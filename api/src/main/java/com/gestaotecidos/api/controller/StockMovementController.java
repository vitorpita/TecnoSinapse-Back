package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.StockMovementDtos;
import com.gestaotecidos.api.service.StockMovementService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stock-movements")
public class StockMovementController {

    private final StockMovementService service;

    public StockMovementController(StockMovementService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product:write')")
    public ResponseEntity<StockMovementDtos.Response> create(@RequestBody @Valid StockMovementDtos.Request data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(data));
    }

    @GetMapping("/product/{productId}")
    @PreAuthorize("hasAuthority('product:read')")
    public ResponseEntity<Page<StockMovementDtos.Response>> findByProduct(
            @PathVariable Long productId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(service.findByProduct(productId, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product:read')")
    public ResponseEntity<StockMovementDtos.Response> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }
}