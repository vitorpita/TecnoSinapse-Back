package com.gestaotecidos.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Set;

public class CargoDtos {

    public record Request(
            @NotBlank @Size(max = 100) String name,
            @Size(max = 255) String description,
            Set<String> permissions
    ) { }

    public record Response(
            Long id,
            String name,
            String description,
            Set<String> permissions,
            boolean active,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) { }
}
