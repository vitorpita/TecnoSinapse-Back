package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.FinancialInstallment;
import com.gestaotecidos.api.domain.Order;
import com.gestaotecidos.api.domain.Payment;
import com.gestaotecidos.api.domain.Enums.InstallmentStatus;
import com.gestaotecidos.api.domain.Enums.PaymentMethod;
import com.gestaotecidos.api.dto.FinancialInstallmentDtos;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.FinancialInstallmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class FinancialInstallmentService {

    private final FinancialInstallmentRepository repository;

    public FinancialInstallmentService(FinancialInstallmentRepository repository) {
        this.repository = repository;
    }

    /**
     * Gera parcelas automaticamente ao faturar o pedido.
     * paymentCondition exemplos: "0" (à vista), "30", "30/60", "30/60/90"
     */
    @Transactional
    public List<FinancialInstallment> generateForOrder(Order order) {
        String condition = order.getPaymentCondition();

        // Métodos à vista sempre geram vencimento para hoje (dia 0)
        PaymentMethod method = order.getPaymentMethod();
        boolean isInstantMethod = method == PaymentMethod.DINHEIRO
                || method == PaymentMethod.PIX
                || method == PaymentMethod.CARTAO_DEBITO;

        if (isInstantMethod || condition == null || condition.isBlank()) {
            condition = "0";
        }

        String[] parts = condition.split("/");
        int total = parts.length;
        BigDecimal installmentAmount = order.getTotalAmount()
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.DOWN);
        BigDecimal remainder = order.getTotalAmount()
                .subtract(installmentAmount.multiply(BigDecimal.valueOf(total)));

        List<FinancialInstallment> installments = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = 0; i < total; i++) {
            int days = Integer.parseInt(parts[i].trim());
            BigDecimal amount = installmentAmount;
            if (i == total - 1) {
                amount = amount.add(remainder);
            }

            var inst = new FinancialInstallment();
            inst.setOrder(order);
            inst.setInstallmentNumber(i + 1);
            inst.setTotalInstallments(total);
            inst.setDueDate(today.plusDays(days));
            inst.setAmount(amount);
            inst.setStatus(InstallmentStatus.PENDENTE);
            inst.setPaymentMethod(order.getPaymentMethod());
            installments.add(repository.save(inst));
        }

        return installments;
    }

    @Transactional
    public void settleInstallment(Long installmentId, Payment payment) {
        var inst = repository.findById(installmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcela", installmentId));

        if (inst.getStatus() == InstallmentStatus.PAGO) {
            return;
        }

        inst.setStatus(InstallmentStatus.PAGO);
        inst.setPayment(payment);
        inst.setPaidAt(LocalDateTime.now());
        repository.save(inst);
    }

    @Transactional
    public void settleEarliestPending(Long orderId, Payment payment) {
        var pending = repository.findByOrderIdAndStatus(orderId, InstallmentStatus.PENDENTE);
        if (!pending.isEmpty()) {
            settleInstallment(pending.get(0).getId(), payment);
        }
    }

    @Transactional
    public void cancelByOrder(Long orderId) {
        repository.findByOrderIdAndStatus(orderId, InstallmentStatus.PENDENTE)
                .forEach(inst -> {
                    inst.setStatus(InstallmentStatus.CANCELADO);
                    repository.save(inst);
                });
    }

    public List<FinancialInstallmentDtos.Response> findByOrder(Long orderId) {
        return repository.findByOrderId(orderId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<FinancialInstallmentDtos.Response> findAll() {
        return repository.findAllActive().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<FinancialInstallmentDtos.Response> findPending() {
        return repository.findByStatus(InstallmentStatus.PENDENTE).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private FinancialInstallmentDtos.Response mapToResponse(FinancialInstallment fi) {
        return new FinancialInstallmentDtos.Response(
                fi.getId(),
                fi.getOrder().getId(),
                fi.getOrder().getClient() != null ? fi.getOrder().getClient().getName() : null,
                fi.getInstallmentNumber(),
                fi.getTotalInstallments(),
                fi.getDueDate(),
                fi.getAmount(),
                fi.getStatus(),
                fi.getPaymentMethod(),
                fi.getPayment() != null ? fi.getPayment().getId() : null,
                fi.getPaidAt(),
                fi.getCreatedAt()
        );
    }
}
