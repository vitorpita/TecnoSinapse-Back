package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.Enums.FreightType;
import com.gestaotecidos.api.domain.Enums.PurchaseOrderStatus;
import com.gestaotecidos.api.domain.commun.BaseDomain;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "purchase_orders")
@Audited
public class PurchaseOrder extends BaseDomain {

    @ManyToOne(optional = false)
    @JoinColumn(name = "supplier_id")
    private Person supplier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "VARCHAR(50)")
    private PurchaseOrderStatus status = PurchaseOrderStatus.ABERTO;

    @Column(nullable = false)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    private LocalDate expectedDeliveryDate;

    @Column(columnDefinition = "TEXT")
    private String observation;

    @Column(length = 100)
    private String paymentCondition;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(50)")
    private FreightType freightType;

    @Column(length = 100)
    private String invoiceNumber;

    private LocalDateTime receivedAt;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseOrderItem> items = new ArrayList<>();

    public PurchaseOrder() {}

    public Person getSupplier() { return supplier; }
    public void setSupplier(Person supplier) { this.supplier = supplier; }
    public PurchaseOrderStatus getStatus() { return status; }
    public void setStatus(PurchaseOrderStatus status) { this.status = status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public LocalDate getExpectedDeliveryDate() { return expectedDeliveryDate; }
    public void setExpectedDeliveryDate(LocalDate expectedDeliveryDate) { this.expectedDeliveryDate = expectedDeliveryDate; }
    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }
    public String getPaymentCondition() { return paymentCondition; }
    public void setPaymentCondition(String paymentCondition) { this.paymentCondition = paymentCondition; }
    public FreightType getFreightType() { return freightType; }
    public void setFreightType(FreightType freightType) { this.freightType = freightType; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }
    public LocalDateTime getReceivedAt() { return receivedAt; }
    public void setReceivedAt(LocalDateTime receivedAt) { this.receivedAt = receivedAt; }
    public List<PurchaseOrderItem> getItems() { return items; }

    public void addItem(PurchaseOrderItem item) {
        items.add(item);
        item.setPurchaseOrder(this);
        calculateTotal();
    }

    public void calculateTotal() {
        this.totalAmount = items.stream()
                .map(PurchaseOrderItem::getSubTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
