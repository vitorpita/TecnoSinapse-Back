package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.domain.Enums.PersonRole;
import com.gestaotecidos.api.dto.PersonDtos;
import com.gestaotecidos.api.service.PersonService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

@RestController
@RequestMapping("/api/persons")
public class PersonController {

    private final PersonService service;

    public PersonController(PersonService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('person:write')")
    public ResponseEntity<PersonDtos.Response> create(@Valid @RequestBody PersonDtos.Request data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(data));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('person:read')")
    public ResponseEntity<Page<PersonDtos.Response>> listAll(
            @PageableDefault(size = 20, sort = "name") Pageable pageable,
            @RequestParam(required = false) PersonRole role,
            @RequestParam(required = false) String search) {
        if (role != null) {
            return ResponseEntity.ok(service.findByRole(role, search, pageable));
        }
        return ResponseEntity.ok(service.findAll(search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('person:read')")
    public ResponseEntity<PersonDtos.Response> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('person:write')")
    public ResponseEntity<PersonDtos.Response> update(@PathVariable Long id, @Valid @RequestBody PersonDtos.Request data) {
        return ResponseEntity.ok(service.update(id, data));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('person:delete')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}