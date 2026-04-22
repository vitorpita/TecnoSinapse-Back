package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.Person;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PersonRepository extends JpaRepository<Person, Long> {

    Page<Person> findByActiveTrue(Pageable pageable);
    Optional<Person> findByIdAndActiveTrue(Long id);
    Optional<Person> findByDocumentAndActiveTrue(String document);
}