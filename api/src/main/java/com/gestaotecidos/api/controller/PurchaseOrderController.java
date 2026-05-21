package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.PurchaseOrderDtos;
import com.gestaotecidos.api.service.PurchaseOrderService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService service;

    public PurchaseOrderController(PurchaseOrderService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('order:write')")
    @Transactional
    public ResponseEntity<PurchaseOrderDtos.Response> create(@RequestBody @Valid PurchaseOrderDtos.Request data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(data));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('order:read')")
    @Transactional(readOnly = true)
    public ResponseEntity<Page<PurchaseOrderDtos.Response>> findAll(
            @PageableDefault(size = 20) Pageable pageable,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(service.findAll(search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('order:read')")
    @Transactional(readOnly = true)
    public ResponseEntity<PurchaseOrderDtos.Response> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('order:write')")
    @Transactional
    public ResponseEntity<PurchaseOrderDtos.Response> update(
            @PathVariable Long id,
            @RequestBody @Valid PurchaseOrderDtos.Request data) {
        return ResponseEntity.ok(service.update(id, data));
    }

    @PatchMapping("/{id}/receive")
    @PreAuthorize("hasAuthority('order:write')")
    @Transactional
    public ResponseEntity<PurchaseOrderDtos.Response> receive(
            @PathVariable Long id,
            @RequestBody @Valid PurchaseOrderDtos.ReceiveRequest data) {
        return ResponseEntity.ok(service.receive(id, data));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('order:delete')")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}