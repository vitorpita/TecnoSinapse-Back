package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.commun.BaseDomain;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
@EntityListeners(AuditingEntityListener.class)
@Audited
public class Product  extends BaseDomain {

    @Column(nullable = false)
    private String name;

    private String sku;
    private String color;

    private String imgUrl;

    @Column(nullable = false)
    private BigDecimal purchasePrice;

    @Column(nullable = false)
    private BigDecimal unitPrice;

    @Column(columnDefinition = "TEXT")
    private String composition;

    private Integer weightGsm;

    private BigDecimal width;

    @Column(nullable = false)
    private BigDecimal stockQuantity;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "provider_id")
    private Long providerId;

    public Product() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getImgUrl() { return imgUrl; }
    public void setImgUrl(String imgUrl) { this.imgUrl = imgUrl; }
    public String getColor() { return color; }
    public void setColor(String color) {this.color = color; }
    public BigDecimal getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(BigDecimal purchasePrice) { this.purchasePrice = purchasePrice; }
    public String getComposition() { return composition; }
    public void setComposition(String composition) { this.composition = composition; }
    public Integer getWeightGsm() { return weightGsm; }
    public void setWeightGsm(Integer weightGsm) { this.weightGsm = weightGsm; }
    public BigDecimal getWidth() { return width; }
    public void setWidth(BigDecimal width) { this.width = width; }
    public BigDecimal getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(BigDecimal stockQuantity) { this.stockQuantity = stockQuantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public Long getProviderId() { return providerId; }
    public void setProviderId(Long providerId) { this.providerId = providerId; }
}