package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.StockMovement;
import com.gestaotecidos.api.domain.Enums.StockMovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    Page<StockMovement> findByProductIdOrderByCreatedAtDesc(Long productId, Pageable pageable);

    List<StockMovement> findByProductIdAndTypeOrderByCreatedAtDesc(Long productId, StockMovementType type);

    @Query("SELECT sm FROM StockMovement sm WHERE sm.createdAt BETWEEN :from AND :to ORDER BY sm.createdAt DESC")
    List<StockMovement> findByPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT sm FROM StockMovement sm WHERE " +
           "(:search = '' OR LOWER(sm.product.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(COALESCE(sm.reason, '')) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY sm.createdAt DESC")
    Page<StockMovement> findBySearch(@Param("search") String search, Pageable pageable);

    @Query("SELECT COALESCE(SUM(m.quantity), 0) FROM StockMovement m WHERE m.type = :type AND m.createdAt >= :from AND m.createdAt < :to AND m.active = true")
    BigDecimal sumQuantityByType(@Param("type") StockMovementType type,
                                 @Param("from") LocalDateTime from,
                                 @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(m.id) FROM StockMovement m WHERE m.createdAt >= :from AND m.createdAt < :to AND m.active = true")
    long countByPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}