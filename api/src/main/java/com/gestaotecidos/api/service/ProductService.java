package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Product;
import com.gestaotecidos.api.dto.ProductDtos;
import com.gestaotecidos.api.repository.CategoryRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository repository;
    private final CategoryRepository categoryRepository;

    public ProductService(ProductRepository repository, CategoryRepository categoryRepository) {
        this.repository = repository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public Product create(ProductDtos.Request data) {
        var product = new Product();
        updateProductFromDto(product, data);
        return repository.save(product);
    }

    @Transactional
    public Product update(Long id, ProductDtos.Request data) {
        var product = findById(id);
        updateProductFromDto(product, data);
        return repository.save(product);
    }

    public List<Product> findAll() {
        return repository.findAll();
    }

    public Product findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado."));
    }

    @Transactional
    public void delete(Long id) {
        var product = findById(id);
        repository.delete(product);
    }

    private void updateProductFromDto(Product product, ProductDtos.Request data) {
        var category = categoryRepository.findById(data.categoryId())
                .orElseThrow(() -> new RuntimeException("Categoria não encontrada."));

        product.setName(data.name());
        product.setSku(data.sku());
        product.setColor(data.color());
        product.setComposition(data.composition());
        product.setWeightGsm(data.weightGsm());
        product.setWidth(data.width());
        product.setStockQuantity(data.stockQuantity());
        product.setUnitPrice(data.unitPrice());
        product.setCategory(category);
    }
}