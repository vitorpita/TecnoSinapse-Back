package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.CategoryDtos;
import com.gestaotecidos.api.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService service;

    public CategoryController(CategoryService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('category:write')")
    public ResponseEntity<CategoryDtos.Response> create(@RequestBody @Valid CategoryDtos.Request data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(data));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('category:read')")
    public ResponseEntity<List<CategoryDtos.Response>> listAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('category:read')")
    public ResponseEntity<CategoryDtos.Response> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('category:write')")
    public ResponseEntity<CategoryDtos.Response> update(@PathVariable Long id, @RequestBody @Valid CategoryDtos.Request data) {
        return ResponseEntity.ok(service.update(id, data));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('category:delete')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}