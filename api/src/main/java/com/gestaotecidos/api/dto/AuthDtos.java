package com.gestaotecidos.api.dto;

public record AuthDtos() {
    public record AuthRequest(String login, String password) { }
    public record AuthResponse(String token) { }
}

