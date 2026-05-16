package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.PersonRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.Set;

public interface PersonDtos {
    record Request(
            @NotBlank(message = "O nome é obrigatório.")
            @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres.")
            String name,

            @Size(max = 14, message = "Documento inválido.")
            String document,

            @Email(message = "Formato de e-mail inválido.")
            String email,

            @Size(max = 11, message = "Telefone inválido.")
            String phone,

            @NotEmpty(message = "Selecione ao menos um tipo.")
            Set<PersonRole> roles,

            String cep,
            String logradouro,
            String numero,
            String bairro,
            String cidade,

            @Size(max = 2, message = "UF deve ter 2 letras.")
            String estado
    ) {}

    record Response(
            Long id,
            String name,
            String document,
            String email,
            String phone,
            Set<PersonRole> roles,
            boolean active,
            String cep,
            String logradouro,
            String numero,
            String bairro,
            String cidade,
            String estado
    ) {}
}