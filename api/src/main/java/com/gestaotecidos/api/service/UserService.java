package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Enums.Role;
import com.gestaotecidos.api.domain.User;
import com.gestaotecidos.api.dto.UserDtos;
import com.gestaotecidos.api.exception.ConflictException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
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

    public UserService(UserRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
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

        return mapToResponse(repository.save(user));
    }

    @Transactional
    public void delete(Long id) {
        var user = findEntityById(id);
        user.deactivate();
        repository.save(user);
    }

    private User findEntityById(Long id) {
        return repository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
    }

    public UserDtos.Response mapToResponse(User user) {
        return new UserDtos.Response(
                user.getId(),
                user.getName(),
                user.getLogin(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}