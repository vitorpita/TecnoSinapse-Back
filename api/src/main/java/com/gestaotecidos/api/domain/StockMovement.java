package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.Enums.StockMovementType;
import com.gestaotecidos.api.domain.commun.BaseDomain;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;

@Entity
@Table(name = "stock_movements")
@Audited
public class StockMovement extends BaseDomain {

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StockMovementType type;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    public StockMovement() {}

    public StockMovement(Product product, StockMovementType type, BigDecimal quantity, String reason) {
        this.product = product;
        this.type = type;
        this.quantity = quantity;
        this.reason = reason;
    }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public StockMovementType getType() { return type; }
    public void setType(StockMovementType type) { this.type = type; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Long getReferenceId() { return referenceId; }
    public void setReferenceId(Long referenceId) { this.referenceId = referenceId; }
    public String getReferenceType() { return referenceType; }
    public void setReferenceType(String referenceType) { this.referenceType = referenceType; }
}