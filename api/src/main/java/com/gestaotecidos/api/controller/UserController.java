package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.UserDtos;
import com.gestaotecidos.api.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<Page<UserDtos.Response>> listAll(
            @PageableDefault(size = 20, sort = "name") Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "false") boolean inactive) {
        return ResponseEntity.ok(service.findAll(pageable, search, inactive));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDtos.Response> getMe() {
        return ResponseEntity.ok(service.getMe());
    }

    @PutMapping("/me")
    public ResponseEntity<UserDtos.Response> updateMe(
            @RequestBody @Valid UserDtos.ProfileUpdateRequest data) {
        return ResponseEntity.ok(service.updateMe(data));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseEntity<UserDtos.Response> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('user:write')")
    public ResponseEntity<UserDtos.Response> update(
            @PathVariable Long id,
            @RequestBody @Valid UserDtos.UpdateRequest data) {
        return ResponseEntity.ok(service.update(id, data));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('user:delete')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivate")
    @PreAuthorize("hasAuthority('user:write')")
    public ResponseEntity<UserDtos.Response> reactivate(@PathVariable Long id) {
        return ResponseEntity.ok(service.reactivate(id));
    }
}