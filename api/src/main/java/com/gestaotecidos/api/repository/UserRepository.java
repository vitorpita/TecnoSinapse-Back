package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByLogin(String login);

    Page<User> findByActiveTrue(Pageable pageable);
    Optional<User> findByIdAndActiveTrue(Long id);
}