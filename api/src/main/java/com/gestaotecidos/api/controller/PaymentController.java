package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.PaymentDtos;
import com.gestaotecidos.api.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<PaymentDtos.Response> create(@RequestBody @Valid PaymentDtos.Request data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(data));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<Page<PaymentDtos.Response>> findAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(service.findAll(search, pageable));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<PaymentDtos.Response>> findByOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(service.findByOrder(orderId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<PaymentDtos.Response> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('order:delete')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}