package com.gestaotecidos.api.repository;

import com.gestaotecidos.api.domain.Cargo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CargoRepository extends JpaRepository<Cargo, Long> {
    Page<Cargo> findByActiveTrue(Pageable pageable);
    List<Cargo> findByActiveTrue();
    Optional<Cargo> findByNameIgnoreCaseAndActiveTrue(String name);
    Optional<Cargo> findByIdAndActiveTrue(Long id);
}
