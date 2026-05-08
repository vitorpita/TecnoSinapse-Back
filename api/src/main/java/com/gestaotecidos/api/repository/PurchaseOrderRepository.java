package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.PurchaseOrder;
import com.gestaotecidos.api.domain.Enums.PurchaseOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    Page<PurchaseOrder> findByActiveTrue(Pageable pageable);
    Optional<PurchaseOrder> findByIdAndActiveTrue(Long id);
    List<PurchaseOrder> findBySupplierIdAndActiveTrue(Long supplierId);
    List<PurchaseOrder> findByStatusAndActiveTrue(PurchaseOrderStatus status);
}