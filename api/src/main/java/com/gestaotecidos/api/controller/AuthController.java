package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.AuthDtos;
import com.gestaotecidos.api.dto.UserDtos;
import com.gestaotecidos.api.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDtos.AuthResponse> register(@RequestBody UserDtos.RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDtos.AuthResponse> authenticate(@RequestBody AuthDtos.AuthRequest request) {
        return ResponseEntity.ok(authService.authenticate(request));
    }
}