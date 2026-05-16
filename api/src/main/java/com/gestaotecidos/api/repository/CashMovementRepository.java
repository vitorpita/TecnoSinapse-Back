package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.CashMovement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashMovementRepository extends JpaRepository<CashMovement, Long> {
}
