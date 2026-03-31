package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Product;
import com.gestaotecidos.api.dto.ProductDtos;
import com.gestaotecidos.api.repository.CategoryRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import com.gestaotecidos.api.repository.ProviderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository repository;
    private final CategoryRepository categoryRepository;
    private final ProviderRepository providerRepository;

    public ProductService(ProductRepository repository, CategoryRepository categoryRepository, ProviderRepository providerRepository) {
        this.repository = repository;
        this.categoryRepository = categoryRepository;
        this.providerRepository = providerRepository;
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
        var provider = providerRepository.findById(data.providerId())
                .orElseThrow(() -> new RuntimeException("Fornecedor não encontrado."));

        product.setName(data.name());
        product.setSku(data.sku());
        product.setComposition(data.composition());
        product.setWeightGsm(data.weightGsm());
        product.setWidth(data.width());
        product.setStockQuantity(data.stockQuantity());
        product.setUnitPrice(data.unitPrice());
        product.setCategory(category);
        product.setProvider(provider);
    }
}