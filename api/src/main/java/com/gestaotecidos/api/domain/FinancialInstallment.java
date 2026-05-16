package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.Enums.InstallmentStatus;
import com.gestaotecidos.api.domain.Enums.PaymentMethod;
import com.gestaotecidos.api.domain.commun.BaseDomain;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "financial_installments")
@Audited
public class FinancialInstallment extends BaseDomain {

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(nullable = false)
    private int installmentNumber;

    @Column(nullable = false)
    private int totalInstallments;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InstallmentStatus status = InstallmentStatus.PENDENTE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentMethod paymentMethod;

    @ManyToOne
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @Column
    private LocalDateTime paidAt;

    public FinancialInstallment() {}

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public int getInstallmentNumber() { return installmentNumber; }
    public void setInstallmentNumber(int installmentNumber) { this.installmentNumber = installmentNumber; }
    public int getTotalInstallments() { return totalInstallments; }
    public void setTotalInstallments(int totalInstallments) { this.totalInstallments = totalInstallments; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public InstallmentStatus getStatus() { return status; }
    public void setStatus(InstallmentStatus status) { this.status = status; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
}
