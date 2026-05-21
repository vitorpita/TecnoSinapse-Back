package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Order;
import com.gestaotecidos.api.domain.OrderItem;
import com.gestaotecidos.api.domain.Enums.OrderStatus;
import com.gestaotecidos.api.domain.Enums.PersonRole;
import com.gestaotecidos.api.dto.OrderDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CashRegisterRepository;
import com.gestaotecidos.api.repository.OrderRepository;
import com.gestaotecidos.api.repository.PersonRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import com.gestaotecidos.api.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final PersonRepository personRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final FinancialInstallmentService installmentService;
    private final CashRegisterRepository cashRegisterRepository;

    public OrderService(OrderRepository orderRepository,
                        PersonRepository personRepository,
                        UserRepository userRepository,
                        ProductRepository productRepository,
                        FinancialInstallmentService installmentService,
                        CashRegisterRepository cashRegisterRepository) {
        this.orderRepository = orderRepository;
        this.personRepository = personRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.installmentService = installmentService;
        this.cashRegisterRepository = cashRegisterRepository;
    }

    @Transactional
    public OrderDtos.Response create(OrderDtos.Request data) {
        var order = new Order();
        order.setStatus(OrderStatus.DIGITACAO);
        populateOrderFields(order, data);
        return mapToResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderDtos.Response update(Long id, OrderDtos.Request data) {
        var order = findEntityById(id);

        if (order.getStatus() != OrderStatus.DIGITACAO) {
            throw new BusinessException("Somente pedidos em DIGITAÇÃO podem ser editados.");
        }

        order.getItems().clear();
        populateOrderFields(order, data);
        return mapToResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderDtos.Response approve(Long id) {
        var order = findEntityById(id);

        if (order.getStatus() != OrderStatus.DIGITACAO && order.getStatus() != OrderStatus.AGUARDANDO_APROVACAO) {
            throw new BusinessException("Somente pedidos em DIGITAÇÃO ou AGUARDANDO APROVAÇÃO podem ser aprovados.");
        }

        order.setStatus(OrderStatus.APROVADO);
        return mapToResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderDtos.Response awaitApproval(Long id) {
        var order = findEntityById(id);

        if (order.getStatus() != OrderStatus.DIGITACAO) {
            throw new BusinessException("Somente pedidos em DIGITAÇÃO podem ser enviados para aprovação.");
        }

        order.setStatus(OrderStatus.AGUARDANDO_APROVACAO);
        return mapToResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderDtos.Response faturar(Long id, OrderDtos.FaturarRequest req) {
        var order = findEntityById(id);

        if (order.getStatus() != OrderStatus.APROVADO) {
            throw new BusinessException("Somente pedidos APROVADOS podem ser faturados.");
        }

        cashRegisterRepository.findOpenRegister().orElseThrow(() ->
                new BusinessException("Não há caixa aberto. Abra o caixa antes de faturar o pedido."));

        if (req != null && req.paymentMethod() != null) {
            order.setPaymentMethod(req.paymentMethod());
        }
        if (req != null && req.paymentCondition() != null) {
            order.setPaymentCondition(req.paymentCondition());
        }

        if (order.getPaymentMethod() == null) {
            throw new BusinessException("Informe a forma de pagamento antes de faturar o pedido.");
        }

        if (order.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessException("O pedido não possui itens ou valor válido para faturamento.");
        }

        // Decrementa estoque somente no faturamento
        order.getItems().forEach(item -> {
            var product = item.getProduct();
            if (product.getStockQuantity().compareTo(item.getQuantity()) < 0) {
                throw new BusinessException(
                        "Estoque insuficiente para '" + product.getName() +
                        "'. Disponível: " + product.getStockQuantity() +
                        ", necessário: " + item.getQuantity());
            }
            product.setStockQuantity(product.getStockQuantity().subtract(item.getQuantity()));
            productRepository.save(product);
        });

        order.setStatus(OrderStatus.FATURADO);
        var saved = orderRepository.save(order);

        // Gera parcelas financeiras automaticamente
        installmentService.generateForOrder(saved);

        return mapToResponse(saved);
    }

    @Transactional
    public OrderDtos.Response cancel(Long id) {
        var order = findEntityById(id);

        if (order.getStatus() == OrderStatus.CANCELADO) {
            throw new BusinessException("Este pedido já foi cancelado.");
        }

        if (order.getStatus() == OrderStatus.ENTREGUE) {
            throw new BusinessException("Não é possível cancelar um pedido já entregue.");
        }

        // Reverte estoque somente se já foi faturado (estoque foi comprometido)
        if (order.getStatus() == OrderStatus.FATURADO ||
            order.getStatus() == OrderStatus.ENVIADO) {
            revertStock(order);
            installmentService.cancelByOrder(order.getId());
        }

        order.setStatus(OrderStatus.CANCELADO);
        return mapToResponse(orderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public Page<OrderDtos.Response> findAll(String search, Pageable pageable) {
        String searchParam = (search != null && !search.isBlank()) ? search : "";
        return orderRepository.findByActiveTrueAndSearch(searchParam, pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<OrderDtos.Response> findAllList() {
        return orderRepository.findAllActive().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderDtos.Response findById(Long id) {
        return mapToResponse(findEntityById(id));
    }

    @Transactional
    public void delete(Long id) {
        var order = findEntityById(id);

        if (order.getStatus() != OrderStatus.DIGITACAO) {
            throw new BusinessException("Somente pedidos em DIGITAÇÃO podem ser excluídos.");
        }

        order.deactivate();
        orderRepository.save(order);
    }

    private Order findEntityById(Long id) {
        return orderRepository.findByIdActive(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
    }

    private void populateOrderFields(Order order, OrderDtos.Request data) {
        var client = personRepository.findByIdAndActiveTrue(data.clientId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", data.clientId()));

        if (!client.getRoles().contains(PersonRole.CLIENTE)) {
            throw new BusinessException("A pessoa informada não possui o papel de CLIENTE.");
        }

        var seller = userRepository.findByIdAndActiveTrue(data.sellerId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendedor", data.sellerId()));

        order.setClient(client);
        order.setSeller(seller);
        order.setPaymentMethod(data.paymentMethod());
        order.setPaymentCondition(data.paymentCondition());
        order.setObservation(data.observation());

        data.items().forEach(itemDto -> {
            var product = productRepository.findByIdAndActiveTrue(itemDto.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", itemDto.productId()));

            order.addItem(new OrderItem(product, itemDto.quantity(), itemDto.unitPrice()));
        });
    }

    private void revertStock(Order order) {
        order.getItems().forEach(item -> {
            var product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity().add(item.getQuantity()));
            productRepository.save(product);
        });
    }

    private OrderDtos.Response mapToResponse(Order order) {
        List<OrderDtos.OrderItemResponse> items = new ArrayList<>();

        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() != null) {
                    items.add(new OrderDtos.OrderItemResponse(
                            item.getId(),
                            item.getProduct().getId(),
                            item.getProduct().getName(),
                            item.getQuantity(),
                            item.getUnitPrice(),
                            item.getSubTotal()
                    ));
                }
            }
        }

        return new OrderDtos.Response(
                order.getId(),
                order.getClient() == null ? null : order.getClient().getId(),
                order.getClient() == null ? null : order.getClient().getName(),
                order.getSeller() == null ? null : order.getSeller().getId(),
                order.getSeller() == null ? null : order.getSeller().getName(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getPaymentMethod(),
                order.getPaymentCondition(),
                order.getObservation(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                items
        );
    }
}
