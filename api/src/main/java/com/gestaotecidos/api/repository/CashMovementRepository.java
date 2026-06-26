package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.CashMovement;
import com.gestaotecidos.api.domain.Enums.CashMovementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface CashMovementRepository extends JpaRepository<CashMovement, Long> {

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashMovement m WHERE m.type IN :types AND m.createdAt >= :from AND m.createdAt < :to AND m.active = true AND m.cancelled = false")
    BigDecimal sumByTypes(@Param("types") Collection<CashMovementType> types,
                          @Param("from") LocalDateTime from,
                          @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(m.id) FROM CashMovement m WHERE m.createdAt >= :from AND m.createdAt < :to AND m.active = true AND m.cancelled = false")
    long countByPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    List<CashMovement> findByOrderIdAndType(Long orderId, CashMovementType type);
}
