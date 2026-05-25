package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.commun.BaseDomain;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;

@Entity
@Table(name = "purchase_order_items")
@Audited
public class PurchaseOrderItem extends BaseDomain {

    @ManyToOne(optional = false)
    @JoinColumn(name = "purchase_order_id")
    private PurchaseOrder purchaseOrder;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private BigDecimal unitCost;

    @Column(nullable = false)
    private BigDecimal subTotal;

    private BigDecimal receivedQuantity = BigDecimal.ZERO;

    private BigDecimal damagedQuantity = BigDecimal.ZERO;

    @Column(length = 255)
    private String damageReason;

    public PurchaseOrderItem() {}

    public PurchaseOrderItem(Product product, BigDecimal quantity, BigDecimal unitCost) {
        this.product = product;
        this.quantity = quantity;
        this.unitCost = unitCost;
        this.calculateSubTotal();
    }

    public PurchaseOrder getPurchaseOrder() { return purchaseOrder; }
    public void setPurchaseOrder(PurchaseOrder purchaseOrder) { this.purchaseOrder = purchaseOrder; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; calculateSubTotal(); }
    public BigDecimal getUnitCost() { return unitCost; }
    public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; calculateSubTotal(); }
    public BigDecimal getSubTotal() { return subTotal; }
    public BigDecimal getReceivedQuantity() { return receivedQuantity != null ? receivedQuantity : BigDecimal.ZERO; }
    public void setReceivedQuantity(BigDecimal receivedQuantity) { this.receivedQuantity = receivedQuantity; }
    public BigDecimal getDamagedQuantity() { return damagedQuantity != null ? damagedQuantity : BigDecimal.ZERO; }
    public void setDamagedQuantity(BigDecimal damagedQuantity) { this.damagedQuantity = damagedQuantity; }
    public String getDamageReason() { return damageReason; }
    public void setDamageReason(String damageReason) { this.damageReason = damageReason; }

    public BigDecimal getPendingQuantity() {
        return quantity.subtract(getReceivedQuantity());
    }

    private void calculateSubTotal() {
        if (this.quantity != null && this.unitCost != null) {
            this.subTotal = this.quantity.multiply(this.unitCost);
        } else {
            this.subTotal = BigDecimal.ZERO;
        }
    }
}
