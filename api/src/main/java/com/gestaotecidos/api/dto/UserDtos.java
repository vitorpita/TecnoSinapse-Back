package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Role;

public class UserDtos {
    public record RegisterRequest (String name, String login, String password, Role role) { }
}
