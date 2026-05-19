package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Cargo;
import com.gestaotecidos.api.domain.Enums.AuditAction;
import com.gestaotecidos.api.domain.Enums.AuditModule;
import com.gestaotecidos.api.domain.Permission;
import com.gestaotecidos.api.dto.CargoDtos;
import com.gestaotecidos.api.exception.ConflictException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CargoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CargoService {

    private final CargoRepository repository;
    private final AuditLogService auditLogService;

    public CargoService(CargoRepository repository, AuditLogService auditLogService) {
        this.repository = repository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public CargoDtos.Response create(CargoDtos.Request data) {
        repository.findByNameIgnoreCaseAndActiveTrue(data.name()).ifPresent(existing -> {
            throw new ConflictException("Cargo '" + data.name() + "' já existe.");
        });

        var cargo = new Cargo(data.name(), data.description(), toPermissions(data.permissions()));
        var saved = repository.save(cargo);
        auditLogService.log(AuditModule.CARGOS, AuditAction.CREATE, saved.getId(), saved.getName(),
                saved.getPermissions().size() + " permissões");
        return mapToResponse(saved);
    }

    @Transactional
    public CargoDtos.Response update(Long id, CargoDtos.Request data) {
        var cargo = findEntityById(id);
        cargo.setName(data.name());
        cargo.setDescription(data.description());
        cargo.setPermissions(toPermissions(data.permissions()));
        var saved = repository.save(cargo);
        auditLogService.log(AuditModule.CARGOS, AuditAction.UPDATE, saved.getId(), saved.getName(),
                saved.getPermissions().size() + " permissões");
        return mapToResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        var cargo = findEntityById(id);
        cargo.deactivate();
        repository.save(cargo);
        auditLogService.log(AuditModule.CARGOS, AuditAction.DEACTIVATE, cargo.getId(), cargo.getName(), null);
    }

    public Page<CargoDtos.Response> findAll(Pageable pageable) {
        return repository.findByActiveTrue(pageable).map(this::mapToResponse);
    }

    public List<CargoDtos.Response> findAllList() {
        return repository.findByActiveTrue().stream().map(this::mapToResponse).toList();
    }

    public CargoDtos.Response findById(Long id) {
        return mapToResponse(findEntityById(id));
    }

    public List<String> getAllAvailablePermissions() {
        return Arrays.stream(Permission.values())
                .map(Permission::getPermission)
                .collect(Collectors.toList());
    }

    private Cargo findEntityById(Long id) {
        return repository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cargo", id));
    }

    private Set<Permission> toPermissions(Set<String> permissionStrings) {
        if (permissionStrings == null) return Set.of();
        return permissionStrings.stream()
                .map(p -> Arrays.stream(Permission.values())
                        .filter(perm -> perm.getPermission().equals(p))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Permissão inválida: " + p)))
                .collect(Collectors.toSet());
    }

    private CargoDtos.Response mapToResponse(Cargo cargo) {
        return new CargoDtos.Response(
                cargo.getId(),
                cargo.getName(),
                cargo.getDescription(),
                cargo.getPermissions().stream()
                        .map(Permission::getPermission)
                        .collect(Collectors.toSet()),
                cargo.isActive(),
                cargo.getCreatedAt(),
                cargo.getUpdatedAt()
        );
    }
}
