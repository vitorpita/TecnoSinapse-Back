package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByOrderId(Long orderId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.order.id = :orderId AND p.active = true")
    BigDecimal sumAmountByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT p FROM Payment p WHERE p.paidAt BETWEEN :from AND :to AND p.active = true ORDER BY p.paidAt DESC")
    List<Payment> findByPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT p FROM Payment p WHERE p.active = true AND " +
           "(:search = '' OR LOWER(p.order.client.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(COALESCE(p.order.client.document, '')) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY p.createdAt DESC")
    Page<Payment> findByActiveTrueAndSearch(@Param("search") String search, Pageable pageable);
}