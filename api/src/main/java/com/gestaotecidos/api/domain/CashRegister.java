package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.commun.BaseDomain;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cash_registers")
@Audited
public class CashRegister extends BaseDomain {

    @ManyToOne(optional = false)
    @JoinColumn(name = "opened_by")
    private User openedBy;

    @ManyToOne
    @JoinColumn(name = "closed_by")
    private User closedBy;

    @Column(nullable = false)
    private BigDecimal openingBalance;

    private BigDecimal closingBalance;

    @Column(nullable = false)
    private LocalDateTime openedAt;

    private LocalDateTime closedAt;

    @Column(columnDefinition = "TEXT")
    private String observation;

    @NotAudited
    @OneToMany(mappedBy = "cashRegister", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CashMovement> movements = new ArrayList<>();

    public CashRegister() {}

    public User getOpenedBy() { return openedBy; }
    public void setOpenedBy(User openedBy) { this.openedBy = openedBy; }
    public User getClosedBy() { return closedBy; }
    public void setClosedBy(User closedBy) { this.closedBy = closedBy; }
    public BigDecimal getOpeningBalance() { return openingBalance; }
    public void setOpeningBalance(BigDecimal openingBalance) { this.openingBalance = openingBalance; }
    public BigDecimal getClosingBalance() { return closingBalance; }
    public void setClosingBalance(BigDecimal closingBalance) { this.closingBalance = closingBalance; }
    public LocalDateTime getOpenedAt() { return openedAt; }
    public void setOpenedAt(LocalDateTime openedAt) { this.openedAt = openedAt; }
    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }
    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }
    public List<CashMovement> getMovements() { return movements; }

    public boolean isClosed() { return closedAt != null; }
}