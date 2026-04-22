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
        return mapToResponse(repository.save(product));
    }

    @Transactional
    public ProductDtos.Response update(Long id, ProductDtos.Request data) {
        var product = findEntityById(id);
        updateProductFromDto(product, data);
        return mapToResponse(repository.save(product));
    }

    public Page<ProductDtos.Response> findAll(Pageable pageable) {
        return repository.findByActiveTrue(pageable).map(this::mapToResponse);
    }

    public ProductDtos.Response findById(Long id) {
        return mapToResponse(findEntityById(id));
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
        product.setSku(data.sku());
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