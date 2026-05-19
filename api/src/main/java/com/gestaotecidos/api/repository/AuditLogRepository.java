package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.AuditLog;
import com.gestaotecidos.api.domain.Enums.AuditModule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByModule(AuditModule module, Pageable pageable);
    Page<AuditLog> findByUserId(Long userId, Pageable pageable);
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
    Page<AuditLog> findByModuleOrderByTimestampDesc(AuditModule module, Pageable pageable);
}
