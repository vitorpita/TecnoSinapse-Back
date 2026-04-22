package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Order;
import com.gestaotecidos.api.domain.OrderItem;
import com.gestaotecidos.api.domain.Enums.PersonRole;
import com.gestaotecidos.api.dto.OrderDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.OrderRepository;
import com.gestaotecidos.api.repository.PersonRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import com.gestaotecidos.api.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final PersonRepository personRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public OrderService(OrderRepository orderRepository,
                        PersonRepository personRepository,
                        UserRepository userRepository,
                        ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.personRepository = personRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public OrderDtos.Response create(OrderDtos.Request data) {
        var order = new Order();
        processOrderData(order, data);
        return mapToResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderDtos.Response update(Long id, OrderDtos.Request data) {
        var order = findEntityById(id);
        revertStock(order);
        order.getItems().clear();
        processOrderData(order, data);
        return mapToResponse(orderRepository.save(order));
    }

    public Page<OrderDtos.Response> findAll(Pageable pageable) {
        return orderRepository.findByActiveTrue(pageable).map(this::mapToResponse);
    }

    public OrderDtos.Response findById(Long id) {
        return mapToResponse(findEntityById(id));
    }

    @Transactional
    public void delete(Long id) {
        var order = findEntityById(id);
        revertStock(order);
        order.deactivate();
        orderRepository.save(order);
    }

    private Order findEntityById(Long id) {
        return orderRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
    }

    private void processOrderData(Order order, OrderDtos.Request data) {
        var client = personRepository.findByIdAndActiveTrue(data.clientId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", data.clientId()));

        if (!client.getRoles().contains(PersonRole.CLIENTE)) {
            throw new BusinessException("A pessoa informada não possui o papel de CLIENTE.");
        }

        var seller = userRepository.findByIdAndActiveTrue(data.sellerId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendedor", data.sellerId()));

        order.setClient(client);
        order.setSeller(seller);
        order.setStatus(data.status());

        data.items().forEach(itemDto -> {
            var product = productRepository.findByIdAndActiveTrue(itemDto.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", itemDto.productId()));

            if (product.getStockQuantity().compareTo(itemDto.quantity()) < 0) {
                throw new BusinessException(
                        "Estoque insuficiente para o produto '" + product.getName() +
                                "'. Disponível: " + product.getStockQuantity() +
                                ", solicitado: " + itemDto.quantity());
            }

            product.setStockQuantity(product.getStockQuantity().subtract(itemDto.quantity()));
            productRepository.save(product);

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
        var itemsResponse = order.getItems().stream()
                .map(item -> new OrderDtos.OrderItemResponse(
                        item.getId(),
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getSubTotal()
                )).toList();

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