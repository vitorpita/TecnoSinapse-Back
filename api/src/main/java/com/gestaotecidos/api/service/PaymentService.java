package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.CashMovement;
import com.gestaotecidos.api.domain.Payment;
import com.gestaotecidos.api.domain.Enums.CashMovementType;
import com.gestaotecidos.api.dto.PaymentDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CashMovementRepository;
import com.gestaotecidos.api.repository.CashRegisterRepository;
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
    private final CashRegisterRepository cashRegisterRepository;
    private final CashMovementRepository cashMovementRepository;
    private final FinancialInstallmentService installmentService;

    public PaymentService(PaymentRepository repository,
                          OrderRepository orderRepository,
                          CashRegisterRepository cashRegisterRepository,
                          CashMovementRepository cashMovementRepository,
                          FinancialInstallmentService installmentService) {
        this.repository = repository;
        this.orderRepository = orderRepository;
        this.cashRegisterRepository = cashRegisterRepository;
        this.cashMovementRepository = cashMovementRepository;
        this.installmentService = installmentService;
    }

    @Transactional
    public PaymentDtos.Response create(PaymentDtos.Request data) {
        cashRegisterRepository.findOpenRegister()
                .orElseThrow(() -> new BusinessException(
                        "Não há caixa aberto. Abra o caixa antes de registrar pagamentos."));

        var order = orderRepository.findById(data.orderId())
                .filter(o -> o.isActive())
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

        var savedPayment = repository.save(payment);

        // Baixa a parcela financeira
        if (data.installmentId() != null) {
            installmentService.settleInstallment(data.installmentId(), savedPayment);
        } else {
            installmentService.settleEarliestPending(order.getId(), savedPayment);
        }

        // Cria movimentação de caixa automaticamente se houver caixa aberto
        cashRegisterRepository.findOpenRegister().ifPresent(cashRegister -> {
            var movement = new CashMovement();
            movement.setCashRegister(cashRegister);
            movement.setType(CashMovementType.RECEBIMENTO);
            movement.setAmount(data.amount());
            movement.setDescription("Recebimento - Pedido #" + order.getId() +
                    " - " + data.paymentMethod().name());
            movement.setOrder(order);
            movement.setPayment(savedPayment);
            cashMovementRepository.save(movement);
        });

        return mapToResponse(savedPayment);
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

    public List<PaymentDtos.Response> findAll() {
        return repository.findAll().stream()
                .filter(Payment::isActive)
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public void delete(Long id) {
        var payment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento", id));
        payment.deactivate();
        repository.save(payment);
    }

    private PaymentDtos.Response mapToResponse(Payment p) {
        var order = p.getOrder();
        var client = order.getClient();

        BigDecimal totalPaid = repository.sumAmountByOrderId(order.getId());
        BigDecimal totalOrderAmount = order.getTotalAmount();
        BigDecimal pending = totalOrderAmount.subtract(totalPaid);

        String paymentStatus;
        if (pending.compareTo(BigDecimal.ZERO) <= 0) {
            paymentStatus = "PAGO";
        } else if (totalPaid.compareTo(BigDecimal.ZERO) > 0) {
            paymentStatus = "PARCIAL";
        } else {
            paymentStatus = "PENDENTE";
        }

        return new PaymentDtos.Response(
                p.getId(),
                p.getPaymentMethod(),
                p.getAmount(),
                p.getPaidAt(),
                p.getTransactionCode(),
                p.getObservation(),
                p.getCreatedAt(),
                order.getId(),
                order.getStatus().name(),
                client.getId(),
                client.getName(),
                client.getDocument(),
                client.getEmail(),
                client.getPhone(),
                totalOrderAmount,
                totalPaid,
                pending,
                paymentStatus
        );
    }
}
