package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.AuditLog;
import com.gestaotecidos.api.domain.Enums.AuditAction;
import com.gestaotecidos.api.domain.Enums.AuditModule;
import com.gestaotecidos.api.domain.User;
import com.gestaotecidos.api.dto.AuditLogDtos;
import com.gestaotecidos.api.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final AuditLogRepository repository;

    public AuditLogService(AuditLogRepository repository) {
        this.repository = repository;
    }

    public void log(AuditModule module, AuditAction action, Long entityId, String entityName, String details) {
        Long userId = null;
        String userName = null;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            userId = user.getId();
            userName = user.getName();
        }

        var entry = new AuditLog(userId, userName, module, action, entityId, entityName, details);
        repository.save(entry);
    }

    public void log(AuditModule module, AuditAction action, Long entityId, String entityName) {
        log(module, action, entityId, entityName, null);
    }

    public void logAs(Long userId, String userName, AuditModule module, AuditAction action,
                      Long entityId, String entityName, String details) {
        var entry = new AuditLog(userId, userName, module, action, entityId, entityName, details);
        repository.save(entry);
    }

    public Page<AuditLogDtos.Response> findAll(Pageable pageable) {
        return repository.findAllByOrderByTimestampDesc(pageable).map(this::mapToResponse);
    }

    public Page<AuditLogDtos.Response> findByModule(AuditModule module, Pageable pageable) {
        return repository.findByModuleOrderByTimestampDesc(module, pageable).map(this::mapToResponse);
    }

    private AuditLogDtos.Response mapToResponse(AuditLog log) {
        return new AuditLogDtos.Response(
                log.getId(),
                log.getTimestamp(),
                log.getUserId(),
                log.getUserName(),
                log.getModule(),
                log.getAction(),
                log.getEntityId(),
                log.getEntityName(),
                log.getDetails()
        );
    }
}
