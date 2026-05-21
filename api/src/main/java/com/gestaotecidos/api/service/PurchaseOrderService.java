package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.PurchaseOrder;
import com.gestaotecidos.api.domain.PurchaseOrderItem;
import com.gestaotecidos.api.domain.StockMovement;
import com.gestaotecidos.api.domain.Enums.PersonRole;
import com.gestaotecidos.api.domain.Enums.PurchaseOrderStatus;
import com.gestaotecidos.api.domain.Enums.StockMovementType;
import com.gestaotecidos.api.dto.PurchaseOrderDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.PersonRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import com.gestaotecidos.api.repository.PurchaseOrderRepository;
import com.gestaotecidos.api.repository.StockMovementRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseOrderService {

    private final PurchaseOrderRepository repository;
    private final PersonRepository personRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;

    public PurchaseOrderService(PurchaseOrderRepository repository,
                                PersonRepository personRepository,
                                ProductRepository productRepository,
                                StockMovementRepository stockMovementRepository) {
        this.repository = repository;
        this.personRepository = personRepository;
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    @Transactional
    public PurchaseOrderDtos.Response create(PurchaseOrderDtos.Request data) {
        var supplier = personRepository.findByIdAndActiveTrue(data.supplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", data.supplierId()));

        if (!supplier.getRoles().contains(PersonRole.FORNECEDOR)) {
            throw new BusinessException("A pessoa informada não possui o papel de FORNECEDOR.");
        }

        var order = new PurchaseOrder();
        order.setSupplier(supplier);
        order.setStatus(data.status());
        order.setExpectedDeliveryDate(data.expectedDeliveryDate());
        order.setObservation(data.observation());

        data.items().forEach(itemDto -> {
            var product = productRepository.findByIdAndActiveTrue(itemDto.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", itemDto.productId()));
            order.addItem(new PurchaseOrderItem(product, itemDto.quantity(), itemDto.unitCost()));
        });

        return mapToResponse(repository.save(order));
    }

    @Transactional
    public PurchaseOrderDtos.Response update(Long id, PurchaseOrderDtos.Request data) {
        var order = findEntityById(id);

        if (order.getStatus() == PurchaseOrderStatus.RECEBIDO || order.getStatus() == PurchaseOrderStatus.CANCELADO) {
            throw new BusinessException("Não é possível editar um pedido com status " + order.getStatus() + ".");
        }

        var supplier = personRepository.findByIdAndActiveTrue(data.supplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", data.supplierId()));

        if (!supplier.getRoles().contains(PersonRole.FORNECEDOR)) {
            throw new BusinessException("A pessoa informada não possui o papel de FORNECEDOR.");
        }

        order.setSupplier(supplier);
        order.setStatus(data.status());
        order.setExpectedDeliveryDate(data.expectedDeliveryDate());
        order.setObservation(data.observation());
        order.getItems().clear();

        data.items().forEach(itemDto -> {
            var product = productRepository.findByIdAndActiveTrue(itemDto.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", itemDto.productId()));
            order.addItem(new PurchaseOrderItem(product, itemDto.quantity(), itemDto.unitCost()));
        });

        return mapToResponse(repository.save(order));
    }

    @Transactional
    public PurchaseOrderDtos.Response receive(Long id, PurchaseOrderDtos.ReceiveRequest data) {
        var order = findEntityById(id);

        if (order.getStatus() == PurchaseOrderStatus.CANCELADO) {
            throw new BusinessException("Não é possível receber um pedido cancelado.");
        }
        if (order.getStatus() == PurchaseOrderStatus.RECEBIDO) {
            throw new BusinessException("Este pedido já foi totalmente recebido.");
        }

        data.items().forEach(receiveDto -> {
            var item = order.getItems().stream()
                    .filter(i -> i.getId().equals(receiveDto.purchaseOrderItemId()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Item do pedido", receiveDto.purchaseOrderItemId()));

            var remaining = item.getQuantity().subtract(item.getReceivedQuantity());
            if (receiveDto.receivedQuantity().compareTo(remaining) > 0) {
                throw new BusinessException(
                        "Quantidade recebida (" + receiveDto.receivedQuantity() +
                                ") excede o pendente (" + remaining + ") para o produto '" + item.getProduct().getName() + "'.");
            }

            item.setReceivedQuantity(item.getReceivedQuantity().add(receiveDto.receivedQuantity()));

            var product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity().add(receiveDto.receivedQuantity()));
            productRepository.save(product);

            var movement = new StockMovement(product, StockMovementType.ENTRADA,
                    receiveDto.receivedQuantity(), "Recebimento pedido de compra #" + id);
            movement.setReferenceId(id);
            movement.setReferenceType("PURCHASE_ORDER");
            stockMovementRepository.save(movement);
        });

        boolean allReceived = order.getItems().stream()
                .allMatch(i -> i.getReceivedQuantity().compareTo(i.getQuantity()) >= 0);
        boolean anyReceived = order.getItems().stream()
                .anyMatch(i -> i.getReceivedQuantity().compareTo(java.math.BigDecimal.ZERO) > 0);

        if (allReceived) {
            order.setStatus(PurchaseOrderStatus.RECEBIDO);
        } else if (anyReceived) {
            order.setStatus(PurchaseOrderStatus.RECEBIDO_PARCIAL);
        }

        return mapToResponse(repository.save(order));
    }

    @Transactional(readOnly = true)
    public Page<PurchaseOrderDtos.Response> findAll(String search, Pageable pageable) {
        String searchParam = (search != null && !search.isBlank()) ? search : "";
        return repository.findByActiveTrueAndSearch(searchParam, pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public PurchaseOrderDtos.Response findById(Long id) {
        return mapToResponse(findEntityByIdWithItems(id));
    }

    @Transactional
    public void delete(Long id) {
        var order = findEntityById(id);
        if (order.getStatus() == PurchaseOrderStatus.RECEBIDO) {
            throw new BusinessException("Não é possível excluir um pedido já recebido.");
        }
        order.deactivate();
        repository.save(order);
    }

    private PurchaseOrder findEntityById(Long id) {
        return repository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido de compra", id));
    }

    private PurchaseOrder findEntityByIdWithItems(Long id) {
        return repository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido de compra", id));
    }

    private PurchaseOrderDtos.Response mapToResponse(PurchaseOrder order) {
        var items = order.getItems().stream()
                .map(i -> new PurchaseOrderDtos.ItemResponse(
                        i.getId(),
                        i.getProduct().getId(),
                        i.getProduct().getName(),
                        i.getQuantity(),
                        i.getReceivedQuantity(),
                        i.getUnitCost(),
                        i.getSubTotal()
                )).toList();

        return new PurchaseOrderDtos.Response(
                order.getId(),
                order.getSupplier().getId(),
                order.getSupplier().getName(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getExpectedDeliveryDate(),
                order.getObservation(),
                items
        );
    }
}