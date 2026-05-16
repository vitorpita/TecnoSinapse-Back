package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.Person;
import com.gestaotecidos.api.domain.Enums.PersonRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface PersonRepository extends JpaRepository<Person, Long> {

    Page<Person> findByActiveTrue(Pageable pageable);
    Optional<Person> findByIdAndActiveTrue(Long id);
    Optional<Person> findByDocumentAndActiveTrue(String document);
    Optional<Person> findByDocument(String document);

    @Query("SELECT DISTINCT p FROM Person p JOIN p.roles r WHERE p.active = true AND r = :role")
    Page<Person> findByRoleAndActiveTrue(@Param("role") PersonRole role, Pageable pageable);

    @Query("SELECT p FROM Person p WHERE p.active = true AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR p.document LIKE CONCAT('%', :search, '%'))")
    Page<Person> searchByNameOrDocument(@Param("search") String search, Pageable pageable);

    @Query("SELECT DISTINCT p FROM Person p JOIN p.roles r WHERE p.active = true AND r = :role AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR p.document LIKE CONCAT('%', :search, '%'))")
    Page<Person> searchByRoleAndNameOrDocument(@Param("role") PersonRole role, @Param("search") String search, Pageable pageable);
}