package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.CashMovement;
import com.gestaotecidos.api.domain.CashRegister;
import com.gestaotecidos.api.domain.User;
import com.gestaotecidos.api.domain.Enums.CashMovementType;
import com.gestaotecidos.api.dto.CashRegisterDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CashRegisterRepository;
import com.gestaotecidos.api.repository.OrderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class CashRegisterService {

    private static final Set<CashMovementType> IN_TYPES = Set.of(
            CashMovementType.ENTRADA, CashMovementType.RECEBIMENTO, CashMovementType.SUPRIMENTO);
    private static final Set<CashMovementType> OUT_TYPES = Set.of(
            CashMovementType.SAIDA, CashMovementType.ESTORNO);
    private static final Set<CashMovementType> SANGRIA_TYPES = Set.of(
            CashMovementType.SANGRIA);
    private static final Set<CashMovementType> SUPRIMENTO_TYPES = Set.of(
            CashMovementType.SUPRIMENTO);

    private final CashRegisterRepository repository;
    private final OrderRepository orderRepository;

    public CashRegisterService(CashRegisterRepository repository, OrderRepository orderRepository) {
        this.repository = repository;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public CashRegisterDtos.Response open(CashRegisterDtos.OpenRequest data, User currentUser) {
        repository.findOpenRegister().ifPresent(existing -> {
            throw new BusinessException("Já existe um caixa aberto (id: " + existing.getId() + "). Feche-o antes de abrir um novo.");
        });

        var cashRegister = new CashRegister();
        cashRegister.setOpenedBy(currentUser);
        cashRegister.setOpeningBalance(data.openingBalance());
        cashRegister.setOpenedAt(LocalDateTime.now());
        cashRegister.setObservation(data.observation());

        return mapToResponse(repository.save(cashRegister));
    }

    @Transactional
    public CashRegisterDtos.Response close(Long id, CashRegisterDtos.CloseRequest data, User currentUser) {
        var cashRegister = findEntityByIdWithMovements(id);

        if (cashRegister.isClosed()) {
            throw new BusinessException("Este caixa já foi fechado.");
        }

        cashRegister.setClosedBy(currentUser);
        cashRegister.setClosingBalance(data.closingBalance());
        cashRegister.setClosedAt(LocalDateTime.now());
        if (data.observation() != null) cashRegister.setObservation(data.observation());

        return mapToResponse(repository.save(cashRegister));
    }

    @Transactional
    public CashRegisterDtos.Response addMovement(Long id, CashRegisterDtos.MovementRequest data) {
        var cashRegister = findEntityByIdWithMovements(id);

        if (cashRegister.isClosed()) {
            throw new BusinessException("Não é possível registrar movimentações em um caixa fechado.");
        }

        var movement = new CashMovement();
        movement.setCashRegister(cashRegister);
        movement.setType(data.type());
        movement.setAmount(data.amount());
        movement.setDescription(data.description());

        if (data.orderId() != null) {
            orderRepository.findById(data.orderId())
                    .ifPresent(movement::setOrder);
        }

        cashRegister.getMovements().add(movement);
        return mapToResponse(repository.save(cashRegister));
    }

    @Transactional
    public void deleteMovement(Long cashId, Long movementId) {
        var cashRegister = findEntityByIdWithMovements(cashId);

        if (cashRegister.isClosed()) {
            throw new BusinessException("Não é possível excluir movimentações de um caixa fechado.");
        }

        boolean removed = cashRegister.getMovements().removeIf(m -> m.getId().equals(movementId));

        if (!removed) {
            throw new ResourceNotFoundException("Movimentação", movementId);
        }

        repository.save(cashRegister);
    }

    public CashRegisterDtos.Response findById(Long id) {
        return mapToResponse(findEntityByIdWithMovements(id));
    }

    public Optional<CashRegisterDtos.Response> findOpenRegister() {
        return repository.findOpenRegisterWithMovements().map(this::mapToResponse);
    }

    public Page<CashRegisterDtos.Response> findAll(Pageable pageable) {
        return repository.findAll(pageable).map(this::mapToSummary);
    }

    private CashRegister findEntityByIdWithMovements(Long id) {
        return repository.findByIdWithMovements(id)
                .orElseThrow(() -> new ResourceNotFoundException("Caixa", id));
    }

    private CashRegisterDtos.Response mapToResponse(CashRegister cr) {
        List<CashMovement> movements = cr.getMovements();

        BigDecimal totalIn = sum(movements, IN_TYPES);
        BigDecimal totalOut = sum(movements, OUT_TYPES);
        BigDecimal totalSangrias = sum(movements, SANGRIA_TYPES);
        BigDecimal totalSuprimentos = sum(movements, SUPRIMENTO_TYPES);
        BigDecimal expectedBalance = cr.getOpeningBalance()
                .add(totalIn).subtract(totalOut).subtract(totalSangrias);

        BigDecimal balanceDifference = cr.getClosingBalance() != null
                ? cr.getClosingBalance().subtract(expectedBalance)
                : null;

        var movementResponses = movements.stream()
                .map(m -> new CashRegisterDtos.MovementResponse(
                        m.getId(),
                        m.getType(),
                        m.getAmount(),
                        m.getDescription(),
                        m.getOrder() != null ? m.getOrder().getId() : null,
                        m.getPayment() != null ? m.getPayment().getId() : null,
                        m.getCreatedAt()
                )).toList();

        return new CashRegisterDtos.Response(
                cr.getId(),
                cr.getOpenedBy().getId(),
                cr.getOpenedBy().getName(),
                cr.getClosedBy() != null ? cr.getClosedBy().getId() : null,
                cr.getClosedBy() != null ? cr.getClosedBy().getName() : null,
                cr.getOpeningBalance(),
                cr.getClosingBalance(),
                cr.getOpenedAt(),
                cr.getClosedAt(),
                cr.getObservation(),
                cr.isClosed(),
                totalIn,
                totalOut,
                totalSangrias,
                totalSuprimentos,
                expectedBalance,
                balanceDifference,
                movementResponses
        );
    }

    private CashRegisterDtos.Response mapToSummary(CashRegister cr) {
        return new CashRegisterDtos.Response(
                cr.getId(),
                cr.getOpenedBy().getId(),
                cr.getOpenedBy().getName(),
                cr.getClosedBy() != null ? cr.getClosedBy().getId() : null,
                cr.getClosedBy() != null ? cr.getClosedBy().getName() : null,
                cr.getOpeningBalance(),
                cr.getClosingBalance(),
                cr.getOpenedAt(),
                cr.getClosedAt(),
                cr.getObservation(),
                cr.isClosed(),
                null, null, null, null, null, null,
                List.of()
        );
    }

    private BigDecimal sum(List<CashMovement> movements, Set<CashMovementType> types) {
        return movements.stream()
                .filter(m -> types.contains(m.getType()))
                .map(CashMovement::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
