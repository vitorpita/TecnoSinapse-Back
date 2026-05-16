package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.Enums.OrderStatus;
import com.gestaotecidos.api.domain.Enums.PaymentMethod;
import com.gestaotecidos.api.domain.commun.BaseDomain;
import com.gestaotecidos.api.domain.converter.OrderStatusConverter;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Audited
public class Order extends BaseDomain {

    @ManyToOne(optional = false)
    @JoinColumn(name = "client_id")
    private Person client;

    @ManyToOne(optional = false)
    @JoinColumn(name = "seller_id")
    private User seller;

    @Convert(converter = OrderStatusConverter.class)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.DIGITACAO;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private PaymentMethod paymentMethod;

    @Column(length = 50)
    private String paymentCondition;

    @Column(columnDefinition = "TEXT")
    private String observation;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    public Order() {}

    public Person getClient() { return client; }
    public void setClient(Person client) { this.client = client; }
    public User getSeller() { return seller; }
    public void setSeller(User seller) { this.seller = seller; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPaymentCondition() { return paymentCondition; }
    public void setPaymentCondition(String paymentCondition) { this.paymentCondition = paymentCondition; }
    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }
    public List<OrderItem> getItems() { return items; }

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
        calculateTotal();
    }

    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
        calculateTotal();
    }

    public void calculateTotal() {
        this.totalAmount = items.stream()
                .map(OrderItem::getSubTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
