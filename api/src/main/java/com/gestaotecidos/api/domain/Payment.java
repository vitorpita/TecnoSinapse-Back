package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.Enums.PaymentMethod;
import com.gestaotecidos.api.domain.commun.BaseDomain;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Audited
public class Payment extends BaseDomain {

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDateTime paidAt;

    @Column(length = 100)
    private String transactionCode;

    @Column(columnDefinition = "TEXT")
    private String observation;

    public Payment() {}

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    public String getTransactionCode() { return transactionCode; }
    public void setTransactionCode(String transactionCode) { this.transactionCode = transactionCode; }
    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }
}