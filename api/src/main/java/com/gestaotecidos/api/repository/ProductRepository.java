package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    List<Product> findByCategoryId(Long categoryId);
    List<Product> findByProviderId(Long providerId);

    List<Product> findByStockQuantityLessThan(java.math.BigDecimal threshold);
}