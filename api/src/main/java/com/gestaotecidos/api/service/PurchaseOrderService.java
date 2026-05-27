package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.CashMovement;
import com.gestaotecidos.api.domain.PurchaseOrder;
import com.gestaotecidos.api.domain.PurchaseOrderItem;
import com.gestaotecidos.api.domain.StockMovement;
import com.gestaotecidos.api.domain.Enums.CashMovementType;
import com.gestaotecidos.api.domain.Enums.PersonRole;
import com.gestaotecidos.api.domain.Enums.PurchaseOrderStatus;
import com.gestaotecidos.api.domain.Enums.StockMovementType;
import com.gestaotecidos.api.dto.PurchaseOrderDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CashMovementRepository;
import com.gestaotecidos.api.repository.CashRegisterRepository;
import com.gestaotecidos.api.repository.PersonRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import com.gestaotecidos.api.repository.PurchaseOrderRepository;
import com.gestaotecidos.api.repository.StockMovementRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PurchaseOrderService {

    private final PurchaseOrderRepository repository;
    private final PersonRepository personRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final CashRegisterRepository cashRegisterRepository;
    private final CashMovementRepository cashMovementRepository;

    public PurchaseOrderService(PurchaseOrderRepository repository,
                                PersonRepository personRepository,
                                ProductRepository productRepository,
                                StockMovementRepository stockMovementRepository,
                                CashRegisterRepository cashRegisterRepository,
                                CashMovementRepository cashMovementRepository) {
        this.repository = repository;
        this.personRepository = personRepository;
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.cashRegisterRepository = cashRegisterRepository;
        this.cashMovementRepository = cashMovementRepository;
    }

    @Transactional
    public PurchaseOrderDtos.Response create(PurchaseOrderDtos.Request data) {
        var supplier = personRepository.findByIdAndActiveTrue(data.supplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", data.supplierId()));

        if (!supplier.getRoles().contains(PersonRole.FORNECEDOR)) {
            throw new BusinessException("A pessoa informada não possui o papel de FORNECEDOR.");
        }

        validateNoDuplicateProducts(data.items());

        var order = new PurchaseOrder();
        order.setSupplier(supplier);
        order.setStatus(PurchaseOrderStatus.ABERTO);
        order.setExpectedDeliveryDate(data.expectedDeliveryDate());
        order.setPaymentCondition(data.paymentCondition());
        order.setFreightType(data.freightType());
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

        if (order.getStatus() != PurchaseOrderStatus.ABERTO) {
            throw new BusinessException("Somente pedidos em ABERTO podem ser editados.");
        }

        var supplier = personRepository.findByIdAndActiveTrue(data.supplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", data.supplierId()));

        if (!supplier.getRoles().contains(PersonRole.FORNECEDOR)) {
            throw new BusinessException("A pessoa informada não possui o papel de FORNECEDOR.");
        }

        validateNoDuplicateProducts(data.items());

        order.setSupplier(supplier);
        order.setExpectedDeliveryDate(data.expectedDeliveryDate());
        order.setPaymentCondition(data.paymentCondition());
        order.setFreightType(data.freightType());
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
    public PurchaseOrderDtos.Response approve(Long id) {
        var order = findEntityById(id);
        if (order.getStatus() != PurchaseOrderStatus.ABERTO) {
            throw new BusinessException("Somente pedidos em ABERTO podem ser aprovados.");
        }
        order.setStatus(PurchaseOrderStatus.APROVADO);
        return mapToResponse(repository.save(order));
    }

    @Transactional
    public PurchaseOrderDtos.Response sendToReceiving(Long id) {
        var order = findEntityById(id);
        if (order.getStatus() != PurchaseOrderStatus.APROVADO) {
            throw new BusinessException("Somente pedidos APROVADOS podem ser enviados para recebimento.");
        }
        order.setStatus(PurchaseOrderStatus.AGUARDANDO_RECEBIMENTO);
        return mapToResponse(repository.save(order));
    }

    @Transactional
    public PurchaseOrderDtos.Response receive(Long id, PurchaseOrderDtos.ReceiveRequest req) {
        var order = findEntityByIdWithItems(id);

        if (order.getStatus() != PurchaseOrderStatus.AGUARDANDO_RECEBIMENTO &&
            order.getStatus() != PurchaseOrderStatus.RECEBIDO_PARCIAL) {
            throw new BusinessException("Somente pedidos aguardando recebimento ou com recebimento parcial podem receber mercadorias.");
        }

        req.items().forEach(itemReq -> {
            var item = order.getItems().stream()
                    .filter(i -> i.getId().equals(itemReq.itemId()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Item do pedido", itemReq.itemId()));

            BigDecimal pending = item.getPendingQuantity();
            BigDecimal toReceive = itemReq.receivedQuantity();
            BigDecimal damaged = itemReq.damagedQuantity() != null ? itemReq.damagedQuantity() : BigDecimal.ZERO;

            if (toReceive.compareTo(BigDecimal.ZERO) == 0 && damaged.compareTo(BigDecimal.ZERO) == 0) {
                return;
            }

            if (toReceive.compareTo(pending) > 0) {
                throw new BusinessException("Quantidade recebida para '" + item.getProduct().getName() +
                        "' excede o saldo pendente de " + pending.toPlainString() + " unidades.");
            }

            if (damaged.compareTo(toReceive) > 0) {
                throw new BusinessException("Quantidade avariada não pode ser maior que a quantidade recebida para '" +
                        item.getProduct().getName() + "'.");
            }

            BigDecimal netReceived = toReceive.subtract(damaged);

            item.setReceivedQuantity(item.getReceivedQuantity().add(toReceive));
            item.setDamagedQuantity(item.getDamagedQuantity().add(damaged));
            if (itemReq.damageReason() != null && !itemReq.damageReason().isBlank()) {
                item.setDamageReason(itemReq.damageReason());
            }

            if (netReceived.compareTo(BigDecimal.ZERO) > 0) {
                var product = item.getProduct();
                product.setStockQuantity(product.getStockQuantity().add(netReceived));
                productRepository.save(product);

                var movement = new StockMovement(product, StockMovementType.ENTRADA,
                        netReceived, "Recebimento - Pedido de compra #" + order.getId());
                movement.setReferenceId(order.getId());
                movement.setReferenceType("PURCHASE_ORDER");
                stockMovementRepository.save(movement);
            }
        });

        if (req.invoiceNumber() != null && !req.invoiceNumber().isBlank()) {
            order.setInvoiceNumber(req.invoiceNumber());
        }
        if (req.observations() != null && !req.observations().isBlank()) {
            order.setObservation(req.observations());
        }
        order.setReceivedAt(LocalDateTime.now());

        boolean allReceived = order.getItems().stream()
                .allMatch(i -> i.getPendingQuantity().compareTo(BigDecimal.ZERO) <= 0);

        order.setStatus(allReceived ? PurchaseOrderStatus.RECEBIDO_TOTAL : PurchaseOrderStatus.RECEBIDO_PARCIAL);

        return mapToResponse(repository.save(order));
    }

    @Transactional
    public PurchaseOrderDtos.Response finalize(Long id) {
        var order = findEntityById(id);
        if (order.getStatus() != PurchaseOrderStatus.RECEBIDO_TOTAL) {
            throw new BusinessException("Somente pedidos com recebimento total podem ser finalizados. Registre o recebimento de todos os itens antes de finalizar.");
        }

        var cashRegister = cashRegisterRepository.findOpenRegister()
                .orElseThrow(() -> new BusinessException("Nenhum caixa aberto. Abra o caixa antes de finalizar o pedido de compra."));

        order.setStatus(PurchaseOrderStatus.FINALIZADO);
        var saved = repository.save(order);

        BigDecimal receivedAmount = saved.getItems().stream()
                .map(i -> i.getReceivedQuantity().subtract(i.getDamagedQuantity()).multiply(i.getUnitCost()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (receivedAmount.compareTo(BigDecimal.ZERO) > 0) {
            var movement = new CashMovement();
            movement.setCashRegister(cashRegister);
            movement.setType(CashMovementType.SAIDA);
            movement.setAmount(receivedAmount);
            movement.setDescription("Pagamento compra - Pedido #" + saved.getId() +
                    (saved.getInvoiceNumber() != null ? " · NF " + saved.getInvoiceNumber() : ""));
            cashMovementRepository.save(movement);
        }

        return mapToResponse(saved);
    }

    @Transactional
    public PurchaseOrderDtos.Response cancel(Long id) {
        var order = findEntityById(id);
        if (order.getStatus() == PurchaseOrderStatus.RECEBIDO_TOTAL ||
            order.getStatus() == PurchaseOrderStatus.FINALIZADO) {
            throw new BusinessException("Não é possível cancelar um pedido já recebido ou finalizado.");
        }
        if (order.getStatus() == PurchaseOrderStatus.CANCELADO) {
            throw new BusinessException("Este pedido já foi cancelado.");
        }
        order.setStatus(PurchaseOrderStatus.CANCELADO);
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
        if (order.getStatus() != PurchaseOrderStatus.ABERTO) {
            throw new BusinessException("Somente pedidos em ABERTO podem ser excluídos.");
        }
        order.deactivate();
        repository.save(order);
    }

    private void validateNoDuplicateProducts(List<PurchaseOrderDtos.ItemRequest> items) {
        Set<Long> seen = items.stream().map(PurchaseOrderDtos.ItemRequest::productId).collect(Collectors.toSet());
        if (seen.size() < items.size()) {
            throw new BusinessException("O pedido contém produtos duplicados. Cada produto deve aparecer apenas uma vez.");
        }
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
                        i.getDamagedQuantity(),
                        i.getPendingQuantity(),
                        i.getUnitCost(),
                        i.getSubTotal(),
                        i.getDamageReason()
                )).toList();

        return new PurchaseOrderDtos.Response(
                order.getId(),
                order.getSupplier().getId(),
                order.getSupplier().getName(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getExpectedDeliveryDate(),
                order.getPaymentCondition(),
                order.getFreightType(),
                order.getInvoiceNumber(),
                order.getObservation(),
                order.getReceivedAt(),
                order.getCreatedAt(),
                items
        );
    }
}
