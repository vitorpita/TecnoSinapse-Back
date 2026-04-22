package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.CashMovement;
import com.gestaotecidos.api.domain.CashRegister;
import com.gestaotecidos.api.dto.CashRegisterDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CashRegisterRepository;
import com.gestaotecidos.api.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class CashRegisterService {

    private final CashRegisterRepository repository;
    private final UserRepository userRepository;

    public CashRegisterService(CashRegisterRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CashRegisterDtos.Response open(CashRegisterDtos.OpenRequest data) {
        repository.findOpenRegister().ifPresent(existing -> {
            throw new BusinessException("Já existe um caixa aberto (id: " + existing.getId() + "). Feche-o antes de abrir um novo.");
        });

        var user = userRepository.findByIdAndActiveTrue(data.openedById())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", data.openedById()));

        var cashRegister = new CashRegister();
        cashRegister.setOpenedBy(user);
        cashRegister.setOpeningBalance(data.openingBalance());
        cashRegister.setOpenedAt(LocalDateTime.now());
        cashRegister.setObservation(data.observation());

        return mapToResponse(repository.save(cashRegister));
    }

    @Transactional
    public CashRegisterDtos.Response close(Long id, CashRegisterDtos.CloseRequest data) {
        var cashRegister = findEntityById(id);

        if (cashRegister.isClosed()) {
            throw new BusinessException("Este caixa já foi fechado.");
        }

        var user = userRepository.findByIdAndActiveTrue(data.closedById())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", data.closedById()));

        cashRegister.setClosedBy(user);
        cashRegister.setClosingBalance(data.closingBalance());
        cashRegister.setClosedAt(LocalDateTime.now());
        if (data.observation() != null) cashRegister.setObservation(data.observation());

        return mapToResponse(repository.save(cashRegister));
    }

    @Transactional
    public CashRegisterDtos.Response addMovement(Long id, CashRegisterDtos.MovementRequest data) {
        var cashRegister = findEntityById(id);

        if (cashRegister.isClosed()) {
            throw new BusinessException("Não é possível registrar movimentações em um caixa fechado.");
        }

        var movement = new CashMovement();
        movement.setCashRegister(cashRegister);
        movement.setType(data.type());
        movement.setAmount(data.amount());
        movement.setDescription(data.description());
        movement.setOrderId(data.orderId());

        cashRegister.getMovements().add(movement);
        return mapToResponse(repository.save(cashRegister));
    }

    public CashRegisterDtos.Response findById(Long id) {
        return mapToResponse(findEntityById(id));
    }

    public CashRegisterDtos.Response findOpenRegister() {
        return mapToResponse(repository.findOpenRegister()
                .orElseThrow(() -> new BusinessException("Não há caixa aberto no momento.")));
    }

    public Page<CashRegisterDtos.Response> findAll(Pageable pageable) {
        return repository.findAll(pageable).map(this::mapToResponse);
    }

    private CashRegister findEntityById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Caixa", id));
    }

    private CashRegisterDtos.Response mapToResponse(CashRegister cr) {
        var movements = cr.getMovements().stream()
                .map(m -> new CashRegisterDtos.MovementResponse(
                        m.getId(),
                        m.getType(),
                        m.getAmount(),
                        m.getDescription(),
                        m.getOrderId(),
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
                movements
        );
    }
}