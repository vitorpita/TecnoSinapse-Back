package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findByActiveTrue(Pageable pageable);
    Optional<Order> findByIdAndActiveTrue(Long id);

    List<Order> findByClientIdAndActiveTrue(Long clientId);
    List<Order> findBySellerIdAndActiveTrue(Long sellerId);
}