package com.gestaotecidos.api.dto;

import com.gestaotecidos.api.domain.Enums.AuditAction;
import com.gestaotecidos.api.domain.Enums.AuditModule;

import java.time.LocalDateTime;

public class AuditLogDtos {

    public record Response(
            Long id,
            LocalDateTime timestamp,
            Long userId,
            String userName,
            AuditModule module,
            AuditAction action,
            Long entityId,
            String entityName,
            String details
    ) { }
}
