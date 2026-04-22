package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.StockMovement;
import com.gestaotecidos.api.domain.Enums.StockMovementType;
import com.gestaotecidos.api.dto.StockMovementDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.ProductRepository;
import com.gestaotecidos.api.repository.StockMovementRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockMovementService {

    private final StockMovementRepository repository;
    private final ProductRepository productRepository;

    public StockMovementService(StockMovementRepository repository, ProductRepository productRepository) {
        this.repository = repository;
        this.productRepository = productRepository;
    }

    @Transactional
    public StockMovementDtos.Response create(StockMovementDtos.Request data) {
        var product = productRepository.findByIdAndActiveTrue(data.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Produto", data.productId()));

        if (data.type() == StockMovementType.SAIDA) {
            if (product.getStockQuantity().compareTo(data.quantity()) < 0) {
                throw new BusinessException(
                        "Estoque insuficiente para o produto '" + product.getName() +
                                "'. Disponível: " + product.getStockQuantity() +
                                ", solicitado: " + data.quantity());
            }
            product.setStockQuantity(product.getStockQuantity().subtract(data.quantity()));
        } else if (data.type() == StockMovementType.ENTRADA || data.type() == StockMovementType.DEVOLUCAO) {
            product.setStockQuantity(product.getStockQuantity().add(data.quantity()));
        } else if (data.type() == StockMovementType.AJUSTE) {
            product.setStockQuantity(data.quantity());
        }

        productRepository.save(product);

        var movement = new StockMovement(product, data.type(), data.quantity(), data.reason());
        return mapToResponse(repository.save(movement));
    }

    public Page<StockMovementDtos.Response> findByProduct(Long productId, Pageable pageable) {
        return repository.findByProductIdOrderByCreatedAtDesc(productId, pageable)
                .map(this::mapToResponse);
    }

    public StockMovementDtos.Response findById(Long id) {
        return mapToResponse(repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação", id)));
    }

    private StockMovementDtos.Response mapToResponse(StockMovement sm) {
        return new StockMovementDtos.Response(
                sm.getId(),
                sm.getProduct().getId(),
                sm.getProduct().getName(),
                sm.getType(),
                sm.getQuantity(),
                sm.getReason(),
                sm.getReferenceId(),
                sm.getReferenceType(),
                sm.getCreatedAt()
        );
    }
}