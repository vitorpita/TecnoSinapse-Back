package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.CashRegisterDtos;
import com.gestaotecidos.api.service.CashRegisterService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cash-registers")
public class CashRegisterController {

    private final CashRegisterService service;

    public CashRegisterController(CashRegisterService service) {
        this.service = service;
    }

    @PostMapping("/open")
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<CashRegisterDtos.Response> open(@RequestBody @Valid CashRegisterDtos.OpenRequest data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.open(data));
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<CashRegisterDtos.Response> close(
            @PathVariable Long id,
            @RequestBody @Valid CashRegisterDtos.CloseRequest data) {
        return ResponseEntity.ok(service.close(id, data));
    }

    @PostMapping("/{id}/movements")
    @PreAuthorize("hasAuthority('order:write')")
    public ResponseEntity<CashRegisterDtos.Response> addMovement(
            @PathVariable Long id,
            @RequestBody @Valid CashRegisterDtos.MovementRequest data) {
        return ResponseEntity.ok(service.addMovement(id, data));
    }

    @GetMapping("/open")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<CashRegisterDtos.Response> findOpen() {
        return ResponseEntity.ok(service.findOpenRegister());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<CashRegisterDtos.Response> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<Page<CashRegisterDtos.Response>> findAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(service.findAll(pageable));
    }
}