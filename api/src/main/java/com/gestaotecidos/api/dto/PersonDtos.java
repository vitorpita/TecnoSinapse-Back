package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.PersonRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public interface PersonDtos {
    record Request(
            @NotBlank String name,
            String document,
            String email,
            String phone,
            @NotEmpty Set<PersonRole> roles
    ) {}

    record Response(
            Long id,
            String name,
            String document,
            String email,
            String phone,
            Set<PersonRole> roles,
            boolean active
    ) {}
}