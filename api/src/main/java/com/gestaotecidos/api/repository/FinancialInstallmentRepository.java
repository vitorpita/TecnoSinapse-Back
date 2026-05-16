package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.FinancialInstallment;
import com.gestaotecidos.api.domain.Enums.InstallmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FinancialInstallmentRepository extends JpaRepository<FinancialInstallment, Long> {

    @Query("SELECT fi FROM FinancialInstallment fi WHERE fi.order.id = :orderId AND fi.active = true ORDER BY fi.installmentNumber ASC")
    List<FinancialInstallment> findByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT fi FROM FinancialInstallment fi WHERE fi.order.id = :orderId AND fi.status = :status AND fi.active = true ORDER BY fi.dueDate ASC")
    List<FinancialInstallment> findByOrderIdAndStatus(@Param("orderId") Long orderId, @Param("status") InstallmentStatus status);

    @Query("SELECT fi FROM FinancialInstallment fi WHERE fi.status = :status AND fi.active = true ORDER BY fi.dueDate ASC")
    List<FinancialInstallment> findByStatus(@Param("status") InstallmentStatus status);

    @Query("SELECT fi FROM FinancialInstallment fi WHERE fi.active = true ORDER BY fi.dueDate ASC")
    List<FinancialInstallment> findAllActive();
}
