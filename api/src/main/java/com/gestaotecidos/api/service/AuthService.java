package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Enums.Role;
import com.gestaotecidos.api.domain.Permission;
import com.gestaotecidos.api.domain.User;
import com.gestaotecidos.api.dto.AuthDtos;
import com.gestaotecidos.api.dto.UserDtos;
import com.gestaotecidos.api.domain.Enums.AuditAction;
import com.gestaotecidos.api.domain.Enums.AuditModule;
import com.gestaotecidos.api.exception.ConflictException;
import com.gestaotecidos.api.repository.CargoRepository;
import com.gestaotecidos.api.repository.UserRepository;
import com.gestaotecidos.api.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CargoRepository cargoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final AuditLogService auditLogService;

    public AuthService(UserRepository userRepository,
                       CargoRepository cargoRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager,
                       AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.cargoRepository = cargoRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.auditLogService = auditLogService;
    }

    public AuthDtos.AuthResponse register(UserDtos.RegisterRequest request) {
        if (userRepository.findByLogin(request.login()).isPresent()) {
            throw new ConflictException("Login '" + request.login() + "' já está em uso.");
        }

        var user = new User(
                request.name(),
                request.login(),
                passwordEncoder.encode(request.password()),
                Role.VENDEDOR
        );
        userRepository.save(user);

        return new AuthDtos.AuthResponse(generateUserToken(user));
    }

    public AuthDtos.AuthResponse adminCreate(UserDtos.AdminCreateRequest request) {
        if (userRepository.findByLogin(request.login()).isPresent()) {
            throw new ConflictException("Login '" + request.login() + "' já está em uso.");
        }

        var user = new User(
                request.name(),
                request.login(),
                passwordEncoder.encode(request.password()),
                request.role()
        );

        if (request.cargoId() != null) {
            cargoRepository.findByIdAndActiveTrue(request.cargoId()).ifPresent(user::setCargo);
        }

        userRepository.save(user);
        auditLogService.log(AuditModule.USERS, AuditAction.CREATE, user.getId(), user.getName(),
                "Login: " + user.getLogin() + " | Perfil: " + user.getRole().name());

        return new AuthDtos.AuthResponse(generateUserToken(user));
    }

    public AuthDtos.AuthResponse authenticate(AuthDtos.AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.login(),
                        request.password()
                )
        );
        var user = userRepository.findByLogin(request.login()).orElseThrow();
        auditLogService.logAs(user.getId(), user.getName(),
                AuditModule.AUTH, AuditAction.LOGIN, user.getId(), user.getName(),
                "Login: " + user.getLogin() + " | Perfil: " + user.getRole().name());
        return new AuthDtos.AuthResponse(generateUserToken(user));
    }

    private String generateUserToken(User user) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("name", user.getName());
        extraClaims.put("role", user.getRole().name());

        if (user.getCargo() != null) {
            extraClaims.put("cargoId", user.getCargo().getId());
            extraClaims.put("cargoName", user.getCargo().getName());
            extraClaims.put("permissions", user.getCargo().getPermissions().stream()
                    .map(Permission::getPermission).toList());
        } else {
            extraClaims.put("permissions", user.getRole().getPermissions().stream()
                    .map(Permission::getPermission).toList());
        }

        return jwtService.generateToken(extraClaims, user);
    }
}