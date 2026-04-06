package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByClientId(Long clientId);
    List<Order> findBySellerId(Long sellerId);
}