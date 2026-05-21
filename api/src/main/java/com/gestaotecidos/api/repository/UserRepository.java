package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByLogin(String login);

    Page<User> findByActiveTrue(Pageable pageable);
    Page<User> findByActiveFalse(Pageable pageable);
    Optional<User> findByIdAndActiveTrue(Long id);
    Optional<User> findById(Long id);

    @Query("SELECT u FROM User u WHERE u.active = true AND " +
           "(:search = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.login) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findByActiveTrueAndSearch(@Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.active = false AND " +
           "(:search = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.login) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findByActiveFalseAndSearch(@Param("search") String search, Pageable pageable);
}