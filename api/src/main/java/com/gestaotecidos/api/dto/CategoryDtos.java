package com.gestaotecidos.api.dto;

import jakarta.validation.constraints.NotBlank;

public interface CategoryDtos {

    record Request(
            @NotBlank(message = "O nome da categoria é obrigatório.") String name
    ) {}

    record Response(
            Long id,
            String name,
            boolean active
    ) {}
}