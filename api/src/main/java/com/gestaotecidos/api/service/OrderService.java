package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Order;
import com.gestaotecidos.api.domain.OrderItem;
import com.gestaotecidos.api.domain.Enums.PersonRole;
import com.gestaotecidos.api.dto.OrderDtos;
import com.gestaotecidos.api.repository.OrderRepository;
import com.gestaotecidos.api.repository.PersonRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import com.gestaotecidos.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final PersonRepository personRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public OrderService(OrderRepository orderRepository, PersonRepository personRepository, UserRepository userRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.personRepository = personRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public OrderDtos.Response create(OrderDtos.Request data) {
        var order = new Order();
        processOrderData(order, data, true);
        order = orderRepository.save(order);
        return mapToResponse(order);
    }

    @Transactional
    public OrderDtos.Response update(Long id, OrderDtos.Request data) {
        var order = findEntityById(id);
        revertStockForUpdate(order);
        order.getItems().clear();
        processOrderData(order, data, false);
        order = orderRepository.save(order);
        return mapToResponse(order);
    }

    public List<OrderDtos.Response> findAll() {
        return orderRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public OrderDtos.Response findById(Long id) {
        return mapToResponse(findEntityById(id));
    }

    @Transactional
    public void delete(Long id) {
        var order = findEntityById(id);
        revertStockForUpdate(order);
        order.deactivate();
        orderRepository.save(order);
    }

    private Order findEntityById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido não encontrado."));
    }

    private void processOrderData(Order order, OrderDtos.Request data, boolean isNew) {
        var client = personRepository.findById(data.clientId())
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado."));

        if (!client.isActive() || !client.getRoles().contains(PersonRole.CLIENTE)) {
            throw new RuntimeException("Cliente inativo ou não possui papel de cliente.");
        }

        var seller = userRepository.findById(data.sellerId())
                .orElseThrow(() -> new RuntimeException("Vendedor não encontrado."));

        if (!seller.isActive()) {
            throw new RuntimeException("Vendedor inativo.");
        }

        order.setClient(client);
        order.setSeller(seller);
        order.setStatus(data.status());

        data.items().forEach(itemDto -> {
            var product = productRepository.findById(itemDto.productId())
                    .orElseThrow(() -> new RuntimeException("Produto não encontrado."));

            if (!product.isActive()) {
                throw new RuntimeException("O produto " + product.getName() + " está inativo.");
            }

            if (product.getStockQuantity().compareTo(itemDto.quantity()) < 0) {
                throw new RuntimeException("Estoque insuficiente para o produto: " + product.getName());
            }

            product.setStockQuantity(product.getStockQuantity().subtract(itemDto.quantity()));
            productRepository.save(product);

            var orderItem = new OrderItem(product, itemDto.quantity(), itemDto.unitPrice());
            order.addItem(orderItem);
        });
    }

    private void revertStockForUpdate(Order order) {
        order.getItems().forEach(item -> {
            var product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity().add(item.getQuantity()));
            productRepository.save(product);
        });
    }

    private OrderDtos.Response mapToResponse(Order order) {
        var itemsResponse = order.getItems().stream()
                .map(item -> new OrderDtos.OrderItemResponse(
                        item.getId(),
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getSubTotal()
                )).collect(Collectors.toList());

        return new OrderDtos.Response(
                order.getId(),
                order.getClient().getId(),
                order.getClient().getName(),
                order.getSeller().getId(),
                order.getSeller().getName(),
                order.getStatus(),
                order.getTotalAmount(),
                itemsResponse
        );
    }
}