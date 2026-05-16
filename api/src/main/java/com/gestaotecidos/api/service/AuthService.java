package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Enums.Role;
import com.gestaotecidos.api.domain.User;
import com.gestaotecidos.api.dto.AuthDtos;
import com.gestaotecidos.api.dto.UserDtos;
import com.gestaotecidos.api.exception.ConflictException;
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
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
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
        userRepository.save(user);

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
        return new AuthDtos.AuthResponse(generateUserToken(user));
    }

    private String generateUserToken(User user) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("name", user.getName());
        extraClaims.put("role", user.getRole().name());
        return jwtService.generateToken(extraClaims, user);
    }
}