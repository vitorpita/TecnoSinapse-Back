package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class UserDtos {

    public record RegisterRequest(
            @NotBlank String name,
            @NotBlank String login,
            @NotBlank String password
    ) {}

    public record AdminCreateRequest(
            @NotBlank String name,
            @NotBlank String login,
            @NotBlank String password,
            @NotNull Role role
    ) {}

    public record UpdateRequest(
            @NotBlank String name,
            @NotBlank String login,
            @NotNull Role role,
            String password
    ) {}

    public record Response(
            Long id,
            String name,
            String login,
            Role role,
            boolean active,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}