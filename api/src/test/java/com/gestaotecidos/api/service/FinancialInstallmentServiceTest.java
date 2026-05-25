package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.FinancialInstallment;
import com.gestaotecidos.api.domain.Order;
import com.gestaotecidos.api.domain.Payment;
import com.gestaotecidos.api.domain.Enums.InstallmentStatus;
import com.gestaotecidos.api.domain.Enums.PaymentMethod;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.FinancialInstallmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FinancialInstallmentService")
class FinancialInstallmentServiceTest {

    @Mock
    FinancialInstallmentRepository repository;

    @InjectMocks
    FinancialInstallmentService service;

    private Order order;

    @BeforeEach
    void setUp() {
        order = new Order();
        order.setId(1L);
        order.setTotalAmount(new BigDecimal("300.00"));
        order.setPaymentMethod(PaymentMethod.BOLETO);
    }

    // ── generateForOrder ─────────────────────────────────────────────────────

    @Test
    @DisplayName("generateForOrder: gera 1 parcela para pagamento à vista (DINHEIRO)")
    void generate_dinheiro_singleInstallmentDueToday() {
        order.setPaymentMethod(PaymentMethod.DINHEIRO);
        order.setPaymentCondition("30");
        when(repository.save(any(FinancialInstallment.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = service.generateForOrder(order);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDueDate()).isEqualTo(LocalDate.now());
        assertThat(result.get(0).getAmount()).isEqualByComparingTo("300.00");
    }

    @Test
    @DisplayName("generateForOrder: gera 1 parcela para PIX com vencimento hoje")
    void generate_pix_singleInstallmentDueToday() {
        order.setPaymentMethod(PaymentMethod.PIX);
        order.setPaymentCondition(null);
        when(repository.save(any(FinancialInstallment.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = service.generateForOrder(order);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDueDate()).isEqualTo(LocalDate.now());
    }

    @Test
    @DisplayName("generateForOrder: gera 1 parcela com vencimento em 30 dias")
    void generate_condition30_oneInstallmentIn30Days() {
        order.setPaymentCondition("30");
        when(repository.save(any(FinancialInstallment.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = service.generateForOrder(order);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDueDate()).isEqualTo(LocalDate.now().plusDays(30));
        assertThat(result.get(0).getAmount()).isEqualByComparingTo("300.00");
    }

    @Test
    @DisplayName("generateForOrder: gera 2 parcelas iguais para condição 30/60")
    void generate_condition3060_twoEqualInstallments() {
        order.setPaymentCondition("30/60");
        when(repository.save(any(FinancialInstallment.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = service.generateForOrder(order);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getDueDate()).isEqualTo(LocalDate.now().plusDays(30));
        assertThat(result.get(1).getDueDate()).isEqualTo(LocalDate.now().plusDays(60));
        assertThat(result.get(0).getAmount()).isEqualByComparingTo("150.00");
        assertThat(result.get(1).getAmount()).isEqualByComparingTo("150.00");
        assertThat(result.get(0).getInstallmentNumber()).isEqualTo(1);
        assertThat(result.get(1).getInstallmentNumber()).isEqualTo(2);
        assertThat(result.get(0).getTotalInstallments()).isEqualTo(2);
    }

    @Test
    @DisplayName("generateForOrder: gera 3 parcelas para condição 30/60/90")
    void generate_condition306090_threeInstallments() {
        order.setPaymentCondition("30/60/90");
        when(repository.save(any(FinancialInstallment.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = service.generateForOrder(order);

        assertThat(result).hasSize(3);
        assertThat(result.get(0).getDueDate()).isEqualTo(LocalDate.now().plusDays(30));
        assertThat(result.get(1).getDueDate()).isEqualTo(LocalDate.now().plusDays(60));
        assertThat(result.get(2).getDueDate()).isEqualTo(LocalDate.now().plusDays(90));
        assertThat(result.get(2).getTotalInstallments()).isEqualTo(3);
    }

    @Test
    @DisplayName("generateForOrder: adiciona remainder na última parcela para evitar centavos perdidos")
    void generate_remainder_addedToLastInstallment() {
        order.setTotalAmount(new BigDecimal("100.00"));
        order.setPaymentCondition("30/60/90"); // 100 / 3 = 33.33, remainder = 0.01
        when(repository.save(any(FinancialInstallment.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = service.generateForOrder(order);

        BigDecimal total = result.stream()
                .map(FinancialInstallment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(total).isEqualByComparingTo("100.00");
        assertThat(result.get(0).getAmount()).isEqualByComparingTo("33.33");
        assertThat(result.get(1).getAmount()).isEqualByComparingTo("33.33");
        assertThat(result.get(2).getAmount()).isEqualByComparingTo("33.34");
    }

    @Test
    @DisplayName("generateForOrder: condição nula com método não à-vista usa condição 0 (hoje)")
    void generate_nullCondition_boletoUsesZero() {
        order.setPaymentCondition(null);
        order.setPaymentMethod(PaymentMethod.BOLETO);
        when(repository.save(any(FinancialInstallment.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = service.generateForOrder(order);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDueDate()).isEqualTo(LocalDate.now());
    }

    // ── settleInstallment ─────────────────────────────────────────────────────

    @Test
    @DisplayName("settleInstallment: marca parcela como PAGO e registra pagamento")
    void settle_marksAsPaid() {
        var installment = new FinancialInstallment();
        installment.setId(1L);
        installment.setStatus(InstallmentStatus.PENDENTE);

        var payment = new Payment();
        when(repository.findById(1L)).thenReturn(Optional.of(installment));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.settleInstallment(1L, payment);

        assertThat(installment.getStatus()).isEqualTo(InstallmentStatus.PAGO);
        assertThat(installment.getPayment()).isEqualTo(payment);
        assertThat(installment.getPaidAt()).isNotNull();
    }

    @Test
    @DisplayName("settleInstallment: ignora parcelas já pagas (idempotente)")
    void settle_alreadyPaid_skipsUpdate() {
        var installment = new FinancialInstallment();
        installment.setId(1L);
        installment.setStatus(InstallmentStatus.PAGO);
        when(repository.findById(1L)).thenReturn(Optional.of(installment));

        service.settleInstallment(1L, new Payment());

        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("settleInstallment: lança ResourceNotFoundException quando parcela não existe")
    void settle_notFound() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.settleInstallment(99L, new Payment()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── cancelByOrder ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("cancelByOrder: cancela todas as parcelas pendentes do pedido")
    void cancel_cancelsPendingInstallments() {
        var i1 = new FinancialInstallment();
        i1.setStatus(InstallmentStatus.PENDENTE);
        var i2 = new FinancialInstallment();
        i2.setStatus(InstallmentStatus.PENDENTE);

        when(repository.findByOrderIdAndStatus(1L, InstallmentStatus.PENDENTE))
                .thenReturn(List.of(i1, i2));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.cancelByOrder(1L);

        assertThat(i1.getStatus()).isEqualTo(InstallmentStatus.CANCELADO);
        assertThat(i2.getStatus()).isEqualTo(InstallmentStatus.CANCELADO);
        verify(repository, times(2)).save(any());
    }

    @Test
    @DisplayName("cancelByOrder: não faz nada quando não há parcelas pendentes")
    void cancel_noPending_doesNothing() {
        when(repository.findByOrderIdAndStatus(1L, InstallmentStatus.PENDENTE))
                .thenReturn(List.of());

        service.cancelByOrder(1L);

        verify(repository, never()).save(any());
    }

    // ── settleEarliestPending ─────────────────────────────────────────────────

    @Test
    @DisplayName("settleEarliestPending: quita a primeira parcela pendente")
    void settleEarliest_settlesFirstPending() {
        var i1 = new FinancialInstallment();
        i1.setId(10L);
        i1.setStatus(InstallmentStatus.PENDENTE);

        when(repository.findByOrderIdAndStatus(1L, InstallmentStatus.PENDENTE))
                .thenReturn(List.of(i1));
        when(repository.findById(10L)).thenReturn(Optional.of(i1));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.settleEarliestPending(1L, new Payment());

        assertThat(i1.getStatus()).isEqualTo(InstallmentStatus.PAGO);
    }

    @Test
    @DisplayName("settleEarliestPending: não faz nada quando não há pendentes")
    void settleEarliest_noPending_doesNothing() {
        when(repository.findByOrderIdAndStatus(1L, InstallmentStatus.PENDENTE))
                .thenReturn(List.of());

        service.settleEarliestPending(1L, new Payment());

        verify(repository, never()).findById(any());
    }
}
