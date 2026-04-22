package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.CashRegister;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CashRegisterRepository extends JpaRepository<CashRegister, Long> {

    @Query("SELECT cr FROM CashRegister cr WHERE cr.closedAt IS NULL AND cr.active = true")
    Optional<CashRegister> findOpenRegister();

    @Query("SELECT cr FROM CashRegister cr WHERE cr.openedAt BETWEEN :from AND :to AND cr.active = true ORDER BY cr.openedAt DESC")
    List<CashRegister> findByPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}