package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Cargo;
import com.gestaotecidos.api.domain.Enums.AuditAction;
import com.gestaotecidos.api.domain.Enums.AuditModule;
import com.gestaotecidos.api.domain.User;
import com.gestaotecidos.api.dto.UserDtos;
import com.gestaotecidos.api.exception.ConflictException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CargoRepository;
import com.gestaotecidos.api.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final CargoRepository cargoRepository;
    private final AuditLogService auditLogService;

    public UserService(UserRepository repository, PasswordEncoder passwordEncoder,
                       CargoRepository cargoRepository, AuditLogService auditLogService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.cargoRepository = cargoRepository;
        this.auditLogService = auditLogService;
    }

    public Page<UserDtos.Response> findAll(Pageable pageable) {
        return repository.findByActiveTrue(pageable).map(this::mapToResponse);
    }

    public UserDtos.Response findById(Long id) {
        return mapToResponse(findEntityById(id));
    }

    @Transactional
    public UserDtos.Response update(Long id, UserDtos.UpdateRequest data) {
        var user = findEntityById(id);

        if (!user.getLogin().equals(data.login())) {
            repository.findByLogin(data.login()).ifPresent(existing -> {
                throw new ConflictException("Login '" + data.login() + "' já está em uso.");
            });
        }

        if (!user.getRole().equals(data.role())) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin) {
                throw new AccessDeniedException("Apenas administradores podem alterar roles.");
            }
        }

        user.setName(data.name());
        user.setLogin(data.login());
        user.setRole(data.role());

        if (data.password() != null && !data.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(data.password()));
        }

        if (data.cargoId() != null) {
            Cargo cargo = cargoRepository.findByIdAndActiveTrue(data.cargoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cargo", data.cargoId()));
            user.setCargo(cargo);
        } else {
            user.setCargo(null);
        }

        var saved = repository.save(user);
        auditLogService.log(AuditModule.USERS, AuditAction.UPDATE, saved.getId(), saved.getName(),
                "Login: " + saved.getLogin() + " | Perfil: " + saved.getRole().name());
        return mapToResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        var user = findEntityById(id);
        user.deactivate();
        repository.save(user);
        auditLogService.log(AuditModule.USERS, AuditAction.DEACTIVATE, user.getId(), user.getName(),
                "Login: " + user.getLogin());
    }

    private User findEntityById(Long id) {
        return repository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
    }

    public UserDtos.Response mapToResponse(User user) {
        var cargo = user.getCargo();
        return new UserDtos.Response(
                user.getId(),
                user.getName(),
                user.getLogin(),
                user.getRole(),
                cargo != null ? cargo.getId() : null,
                cargo != null ? cargo.getName() : null,
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}