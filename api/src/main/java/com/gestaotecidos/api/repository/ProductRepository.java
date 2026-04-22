package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByActiveTrue(Pageable pageable);
    Optional<Product> findByIdAndActiveTrue(Long id);
    Optional<Product> findBySkuAndActiveTrue(String sku);

    List<Product> findByCategoryIdAndActiveTrue(Long categoryId);
    List<Product> findByProviderIdAndActiveTrue(Long providerId);
    List<Product> findByStockQuantityLessThanAndActiveTrue(BigDecimal threshold);
}