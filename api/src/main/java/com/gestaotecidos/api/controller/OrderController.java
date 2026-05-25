package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.OrderDtos;
import com.gestaotecidos.api.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<OrderDtos.Response> create(@RequestBody @Valid OrderDtos.Request data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(data));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<Page<OrderDtos.Response>> listAll(
            @PageableDefault(size = 20, sort = "id") Pageable pageable,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(service.findAll(search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<OrderDtos.Response> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<OrderDtos.Response> update(@PathVariable Long id, @RequestBody @Valid OrderDtos.Request data) {
        return ResponseEntity.ok(service.update(id, data));
    }

    @PatchMapping("/{id}/await-approval")
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<OrderDtos.Response> awaitApproval(@PathVariable Long id) {
        return ResponseEntity.ok(service.awaitApproval(id));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<OrderDtos.Response> approve(@PathVariable Long id) {
        return ResponseEntity.ok(service.approve(id));
    }

    @PatchMapping("/{id}/faturar")
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<OrderDtos.Response> faturar(
            @PathVariable Long id,
            @RequestBody(required = false) OrderDtos.FaturarRequest body) {
        return ResponseEntity.ok(service.faturar(id, body));
    }

    @PatchMapping("/{id}/ship")
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<OrderDtos.Response> ship(@PathVariable Long id) {
        return ResponseEntity.ok(service.ship(id));
    }

    @PatchMapping("/{id}/deliver")
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<OrderDtos.Response> deliver(@PathVariable Long id) {
        return ResponseEntity.ok(service.deliver(id));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<OrderDtos.Response> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(service.cancel(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('order:delete')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
