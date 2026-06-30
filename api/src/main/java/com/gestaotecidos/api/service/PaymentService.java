package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Payment;
import com.gestaotecidos.api.domain.Enums.AuditAction;
import com.gestaotecidos.api.domain.Enums.AuditModule;
import com.gestaotecidos.api.domain.Enums.OrderStatus;
import com.gestaotecidos.api.dto.PaymentDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CashRegisterRepository;
import com.gestaotecidos.api.repository.OrderRepository;
import com.gestaotecidos.api.repository.PaymentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class PaymentService {

    private final PaymentRepository repository;
    private final OrderRepository orderRepository;
    private final CashRegisterRepository cashRegisterRepository;
    private final FinancialInstallmentService installmentService;
    private final AuditLogService auditLogService;

    public PaymentService(PaymentRepository repository,
                          OrderRepository orderRepository,
                          CashRegisterRepository cashRegisterRepository,
                          FinancialInstallmentService installmentService,
                          AuditLogService auditLogService) {
        this.repository = repository;
        this.orderRepository = orderRepository;
        this.cashRegisterRepository = cashRegisterRepository;
        this.installmentService = installmentService;
        this.auditLogService = auditLogService;
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
        auditLogService.log(AuditModule.PAYMENTS, AuditAction.CREATE, savedPayment.getId(),
                "Pagamento pedido #" + order.getId(), "Valor: R$ " + data.amount() + " | Método: " + data.paymentMethod());

        if (data.installmentId() != null) {
            installmentService.settleInstallment(data.installmentId(), savedPayment);
        } else {
            installmentService.settleEarliestPending(order.getId(), savedPayment);
        }

        // Calcula totalPaid sem nova query JPQL para evitar auto-flush duplo do Envers
        BigDecimal totalPaid = alreadyPaid.add(data.amount());
        BigDecimal pending = order.getTotalAmount().subtract(totalPaid);

        String paymentStatus;
        if (order.getStatus() == OrderStatus.CANCELADO) {
            paymentStatus = "CANCELADO";
        } else if (pending.compareTo(BigDecimal.ZERO) <= 0) {
            paymentStatus = "PAGO";
        } else if (totalPaid.compareTo(BigDecimal.ZERO) > 0) {
            paymentStatus = "PARCIAL";
        } else {
            paymentStatus = "PENDENTE";
        }

        var client = order.getClient();
        return new PaymentDtos.Response(
                savedPayment.getId(),
                savedPayment.getPaymentMethod(),
                savedPayment.getAmount(),
                savedPayment.getPaidAt(),
                savedPayment.getTransactionCode(),
                savedPayment.getObservation(),
                savedPayment.getCreatedAt(),
                order.getId(),
                order.getStatus().name(),
                client.getId(),
                client.getName(),
                client.getDocument(),
                client.getEmail(),
                client.getPhone(),
                order.getTotalAmount(),
                totalPaid,
                pending,
                paymentStatus
        );
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

    public Page<PaymentDtos.Response> findAll(String search, Pageable pageable) {
        String searchParam = (search != null && !search.isBlank()) ? search : "";
        return repository.findByActiveTrueAndSearch(searchParam, pageable).map(this::mapToResponse);
    }

    @Transactional
    public void delete(Long id) {
        var payment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento", id));
        payment.deactivate();
        repository.save(payment);
        auditLogService.log(AuditModule.PAYMENTS, AuditAction.DELETE, id, "Pagamento #" + id);
    }

    private PaymentDtos.Response mapToResponse(Payment p) {
        var order = p.getOrder();
        var client = order.getClient();

        BigDecimal totalPaid = repository.sumAmountByOrderId(order.getId());
        BigDecimal totalOrderAmount = order.getTotalAmount();
        BigDecimal pending = totalOrderAmount.subtract(totalPaid);

        String paymentStatus;
        if (order.getStatus() == OrderStatus.CANCELADO) {
            paymentStatus = "CANCELADO";
        } else if (pending.compareTo(BigDecimal.ZERO) <= 0) {
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
