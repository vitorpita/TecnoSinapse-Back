package com.gestaotecidos.api.dto;

import jakarta.validation.constraints.NotBlank;

public interface ProviderDtos {
    record Request(
            @NotBlank String name,
            @NotBlank String cnpj,
            String phone,
            String email,
            String cep,
            String street,
            String number,
            String complement,
            String neighborhood,
            String city,
            String state
    ) {}

    record Response(
            Long id,
            String name,
            String cnpj,
            String city,
            String state
    ) {}
}