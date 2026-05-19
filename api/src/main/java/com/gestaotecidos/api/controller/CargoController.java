package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.CargoDtos;
import com.gestaotecidos.api.service.CargoService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cargos")
public class CargoController {

    private final CargoService service;

    public CargoController(CargoService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<Page<CargoDtos.Response>> listAll(
            @PageableDefault(size = 50, sort = "name") Pageable pageable) {
        return ResponseEntity.ok(service.findAll(pageable));
    }

    @GetMapping("/list")
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<List<CargoDtos.Response>> listAllSimple() {
        return ResponseEntity.ok(service.findAllList());
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<List<String>> getAvailablePermissions() {
        return ResponseEntity.ok(service.getAllAvailablePermissions());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<CargoDtos.Response> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CargoDtos.Response> create(@RequestBody @Valid CargoDtos.Request data) {
        return ResponseEntity.ok(service.create(data));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CargoDtos.Response> update(
            @PathVariable Long id,
            @RequestBody @Valid CargoDtos.Request data) {
        return ResponseEntity.ok(service.update(id, data));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
