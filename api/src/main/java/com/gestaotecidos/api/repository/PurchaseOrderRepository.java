package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.PurchaseOrder;
import com.gestaotecidos.api.domain.Enums.PurchaseOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    @Query("SELECT po FROM PurchaseOrder po WHERE po.active = true")
    Page<PurchaseOrder> findByActiveTrue(Pageable pageable);

    @Query("SELECT po FROM PurchaseOrder po WHERE po.id = :id AND po.active = true")
    Optional<PurchaseOrder> findByIdAndActiveTrue(@Param("id") Long id);

    @Query("""
        SELECT DISTINCT po FROM PurchaseOrder po
        LEFT JOIN FETCH po.items
        LEFT JOIN FETCH po.supplier
        WHERE po.active = true
        ORDER BY po.createdAt DESC
    """)
    Page<PurchaseOrder> findAllWithItems(Pageable pageable);

    @Query("""
        SELECT po FROM PurchaseOrder po
        LEFT JOIN FETCH po.items
        LEFT JOIN FETCH po.supplier
        WHERE po.id = :id AND po.active = true
    """)
    Optional<PurchaseOrder> findByIdWithItems(@Param("id") Long id);

    List<PurchaseOrder> findBySupplierIdAndActiveTrue(Long supplierId);
    List<PurchaseOrder> findByStatusAndActiveTrue(PurchaseOrderStatus status);
}