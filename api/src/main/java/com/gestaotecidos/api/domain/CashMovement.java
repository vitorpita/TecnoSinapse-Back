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

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String description;

    @Column(name = "order_id")
    private Long orderId;

    public CashMovement() {}

    public CashRegister getCashRegister() { return cashRegister; }
    public void setCashRegister(CashRegister cashRegister) { this.cashRegister = cashRegister; }
    public CashMovementType getType() { return type; }
    public void setType(CashMovementType type) { this.type = type; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
}