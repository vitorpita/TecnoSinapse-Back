package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.Enums.CashMovementType;
import com.gestaotecidos.api.domain.commun.BaseDomain;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;

@Entity
@Table(name = "cash_movements")
@Audited
public class CashMovement extends BaseDomain {

    @ManyToOne(optional = false)
    @JoinColumn(name = "cash_register_id")
    private CashRegister cashRegister;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CashMovementType type;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String description;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne
    @JoinColumn(name = "payment_id")
    private Payment payment;

    public CashMovement() {}

    public CashRegister getCashRegister() { return cashRegister; }
    public void setCashRegister(CashRegister cashRegister) { this.cashRegister = cashRegister; }
    public CashMovementType getType() { return type; }
    public void setType(CashMovementType type) { this.type = type; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }
}
