package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Product;
import com.gestaotecidos.api.dto.ProductDtos;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CategoryRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    private final ProductRepository repository;
    private final CategoryRepository categoryRepository;

    public ProductService(ProductRepository repository, CategoryRepository categoryRepository) {
        this.repository = repository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public ProductDtos.Response create(ProductDtos.Request data) {
        var product = new Product();
        updateProductFromDto(product, data);
        var saved = repository.save(product);
        if (saved.getSku() == null || saved.getSku().isBlank()) {
            saved.setSku(String.format("SKU-%05d", saved.getId()));
            saved = repository.save(saved);
        }
        return mapToResponse(saved);
    }

    @Transactional
    public ProductDtos.Response update(Long id, ProductDtos.Request data) {
        var product = findEntityById(id);
        updateProductFromDto(product, data);
        return mapToResponse(repository.save(product));
    }

    public Page<ProductDtos.Response> findAll(String search, Pageable pageable) {
        String searchParam = (search != null && !search.isBlank()) ? search : "";
        return repository.findByActiveTrueAndSearch(searchParam, pageable).map(this::mapToResponse);
    }

    public ProductDtos.Response findById(Long id) {
        return mapToResponse(findEntityById(id));
    }

    public String getNextSku() {
        return String.format("SKU-%05d", repository.findMaxId() + 1);
    }

    @Transactional
    public void delete(Long id) {
        var product = findEntityById(id);
        product.deactivate();
        repository.save(product);
    }

    private Product findEntityById(Long id) {
        return repository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produto", id));
    }

    private void updateProductFromDto(Product product, ProductDtos.Request data) {
        var category = categoryRepository.findById(data.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Categoria", data.categoryId()));

        product.setName(data.name());
        if (data.sku() != null && !data.sku().isBlank()) {
            product.setSku(data.sku());
        }
        product.setImgUrl(data.imgUrl());
        product.setColor(data.color());
        product.setComposition(data.composition());
        product.setWeightGsm(data.weightGsm());
        product.setWidth(data.width());
        product.setStockQuantity(data.stockQuantity());
        product.setUnitPrice(data.unitPrice());
        product.setPurchasePrice(data.purchasePrice());
        product.setProviderId(data.providerId());
        product.setCategory(category);
    }

    private ProductDtos.Response mapToResponse(Product product) {
        return new ProductDtos.Response(
                product.getId(),
                product.getName(),
                product.getSku(),
                product.getColor(),
                product.getComposition(),
                product.getWeightGsm(),
                product.getImgUrl(),
                product.getWidth(),
                product.getStockQuantity(),
                product.getUnitPrice(),
                product.getPurchasePrice(),
                product.getCategory() != null ? product.getCategory().getId() : null,
                product.getCategory() != null ? product.getCategory().getName() : null,
                product.getProviderId(),
                product.isActive(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}