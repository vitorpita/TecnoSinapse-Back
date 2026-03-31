package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.User;
import com.gestaotecidos.api.dto.AuthDtos;
import com.gestaotecidos.api.dto.UserDtos;
import com.gestaotecidos.api.repository.UserRepository;
import com.gestaotecidos.api.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService, AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    public AuthDtos.AuthResponse register(UserDtos.RegisterRequest request) {
        var user = new User(
                request.name(),
                request.login(),
                passwordEncoder.encode(request.password()),
                request.role()
        );
        userRepository.save(user);
        var jwtToken = jwtService.generateToken(user);
        return new AuthDtos.AuthResponse(jwtToken);
    }

    public AuthDtos.AuthResponse authenticate(AuthDtos.AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.login(),
                        request.password()
                )
        );
        var user = userRepository.findByLogin(request.login()).orElseThrow();
        var jwtToken = jwtService.generateToken(user);
        return new AuthDtos.AuthResponse(jwtToken);
    }
}