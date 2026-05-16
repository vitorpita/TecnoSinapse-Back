package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT o FROM Order o WHERE o.active = true")
    List<Order> findAllActive();

    @Query("SELECT o FROM Order o WHERE o.active = true ORDER BY o.id DESC")
    Page<Order> findByActiveTrue(Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.id = :id AND o.active = true")
    Optional<Order> findByIdActive(@Param("id") Long id);

    List<Order> findByClientIdAndActiveTrue(Long clientId);
    List<Order> findBySellerIdAndActiveTrue(Long sellerId);
}