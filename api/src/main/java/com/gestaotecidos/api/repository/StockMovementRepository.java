package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.StockMovement;
import com.gestaotecidos.api.domain.Enums.StockMovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    Page<StockMovement> findByProductIdOrderByCreatedAtDesc(Long productId, Pageable pageable);

    List<StockMovement> findByProductIdAndTypeOrderByCreatedAtDesc(Long productId, StockMovementType type);

    @Query("SELECT sm FROM StockMovement sm WHERE sm.createdAt BETWEEN :from AND :to ORDER BY sm.createdAt DESC")
    List<StockMovement> findByPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}