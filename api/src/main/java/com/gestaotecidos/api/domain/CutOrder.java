package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.commun.BaseDomain;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;

@Entity
@Table(name = "cut_orders")
@Audited
public class CutOrder extends BaseDomain {

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false)
    private BigDecimal quantityConsumed;

    @Column(nullable = false)
    private BigDecimal waste;

    @Column(columnDefinition = "TEXT")
    private String observation;

    public CutOrder() {}

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public BigDecimal getQuantityConsumed() { return quantityConsumed; }
    public void setQuantityConsumed(BigDecimal quantityConsumed) { this.quantityConsumed = quantityConsumed; }
    public BigDecimal getWaste() { return waste; }
    public void setWaste(BigDecimal waste) { this.waste = waste; }
    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }
}