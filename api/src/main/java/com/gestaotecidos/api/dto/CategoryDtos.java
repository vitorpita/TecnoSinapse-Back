package com.gestaotecidos.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public interface CategoryDtos {

    record Request(
            @NotBlank(message = "O nome da categoria é obrigatório.")
            @Size(max = 100, message = "Nome deve ter no máximo 100 caracteres.")
            String name,

            @Size(max = 255, message = "Descrição deve ter no máximo 255 caracteres.")
            String description
    ) {}

    record Response(
            Long id,
            String name,
            String description,
            boolean active
    ) {}
}