package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Payment;
import com.gestaotecidos.api.dto.PaymentDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.OrderRepository;
import com.gestaotecidos.api.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class PaymentService {

    private final PaymentRepository repository;
    private final OrderRepository orderRepository;

    public PaymentService(PaymentRepository repository, OrderRepository orderRepository) {
        this.repository = repository;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public PaymentDtos.Response create(PaymentDtos.Request data) {
        var order = orderRepository.findByIdAndActiveTrue(data.orderId())
                .orElseThrow(() -> new ResourceNotFoundException("Pedido", data.orderId()));

        BigDecimal alreadyPaid = repository.sumAmountByOrderId(data.orderId());
        BigDecimal remaining = order.getTotalAmount().subtract(alreadyPaid);

        if (data.amount().compareTo(remaining) > 0) {
            throw new BusinessException(
                    "Valor do pagamento (R$ " + data.amount() +
                            ") excede o saldo restante do pedido (R$ " + remaining + ").");
        }

        var payment = new Payment();
        payment.setOrder(order);
        payment.setPaymentMethod(data.paymentMethod());
        payment.setAmount(data.amount());
        payment.setPaidAt(data.paidAt());
        payment.setTransactionCode(data.transactionCode());
        payment.setObservation(data.observation());

        return mapToResponse(repository.save(payment));
    }

    public List<PaymentDtos.Response> findByOrder(Long orderId) {
        return repository.findByOrderId(orderId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    public PaymentDtos.Response findById(Long id) {
        return mapToResponse(repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento", id)));
    }

    @Transactional
    public void delete(Long id) {
        var payment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento", id));
        payment.deactivate();
        repository.save(payment);
    }

    private PaymentDtos.Response mapToResponse(Payment p) {
        return new PaymentDtos.Response(
                p.getId(),
                p.getOrder().getId(),
                p.getPaymentMethod(),
                p.getAmount(),
                p.getPaidAt(),
                p.getTransactionCode(),
                p.getObservation(),
                p.getCreatedAt()
        );
    }
}