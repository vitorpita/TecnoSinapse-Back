package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.Enums.AuditAction;
import com.gestaotecidos.api.domain.Enums.AuditModule;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_module", columnList = "module"),
        @Index(name = "idx_audit_user", columnList = "userId"),
        @Index(name = "idx_audit_timestamp", columnList = "timestamp")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    private Long userId;
    private String userName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditModule module;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    private Long entityId;
    private String entityName;

    @Column(length = 500)
    private String details;

    @PrePersist
    protected void prePersist() {
        if (timestamp == null) timestamp = LocalDateTime.now();
    }

    public AuditLog() { }

    public AuditLog(Long userId, String userName, AuditModule module, AuditAction action,
                    Long entityId, String entityName, String details) {
        this.userId = userId;
        this.userName = userName;
        this.module = module;
        this.action = action;
        this.entityId = entityId;
        this.entityName = entityName;
        this.details = details;
    }

    public Long getId() { return id; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public Long getUserId() { return userId; }
    public String getUserName() { return userName; }
    public AuditModule getModule() { return module; }
    public AuditAction getAction() { return action; }
    public Long getEntityId() { return entityId; }
    public String getEntityName() { return entityName; }
    public String getDetails() { return details; }
}
