package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.domain.Category;
import com.gestaotecidos.api.repository.CategoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryRepository repository;

    public CategoryController(CategoryRepository repository) {
        this.repository = repository;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('category:write')")
    public ResponseEntity<Category> create(@RequestBody Category data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(data));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('category:read')")
    public ResponseEntity<List<Category>> listAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('category:delete')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}