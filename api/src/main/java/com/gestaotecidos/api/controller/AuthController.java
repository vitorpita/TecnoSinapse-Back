package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.AuthDtos;
import com.gestaotecidos.api.dto.UserDtos;
import com.gestaotecidos.api.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDtos.AuthResponse> register(
            @RequestBody @Valid UserDtos.RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/admin/create-user")
    @PreAuthorize("hasAuthority('user:write')")
    public ResponseEntity<AuthDtos.AuthResponse> adminCreate(
            @RequestBody @Valid UserDtos.AdminCreateRequest request) {
        return ResponseEntity.ok(authService.adminCreate(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDtos.AuthResponse> authenticate(
            @RequestBody @Valid AuthDtos.AuthRequest request) {
        return ResponseEntity.ok(authService.authenticate(request));
    }
}