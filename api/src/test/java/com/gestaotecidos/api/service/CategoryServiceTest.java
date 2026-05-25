package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Category;
import com.gestaotecidos.api.dto.CategoryDtos;
import com.gestaotecidos.api.exception.ConflictException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CategoryService")
class CategoryServiceTest {

    @Mock
    CategoryRepository repository;

    @InjectMocks
    CategoryService service;

    private Category category;

    @BeforeEach
    void setUp() {
        category = new Category();
        category.setId(1L);
        category.setName("Tecidos Planos");
        category.setDescription("Tecidos com estrutura plana");
    }

    // ── create ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("create: salva e retorna DTO quando nome é único")
    void create_success() {
        var request = new CategoryDtos.Request("Tecidos Planos", "Descrição");
        when(repository.findByNameIgnoreCase("Tecidos Planos")).thenReturn(Optional.empty());
        when(repository.save(any(Category.class))).thenReturn(category);

        var response = service.create(request);

        assertThat(response.name()).isEqualTo("Tecidos Planos");
        verify(repository).save(any(Category.class));
    }

    @Test
    @DisplayName("create: lança ConflictException quando nome já existe")
    void create_duplicateName_throwsConflict() {
        var request = new CategoryDtos.Request("Tecidos Planos", null);
        when(repository.findByNameIgnoreCase("Tecidos Planos")).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Tecidos Planos");

        verify(repository, never()).save(any());
    }

    // ── findAll ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("findAll: retorna apenas categorias ativas")
    void findAll_returnsOnlyActive() {
        var inactive = new Category();
        inactive.setId(2L);
        inactive.setName("Inativa");
        inactive.deactivate();

        when(repository.findAll()).thenReturn(List.of(category, inactive));

        var result = service.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Tecidos Planos");
    }

    @Test
    @DisplayName("findAll: retorna lista vazia quando não há categorias ativas")
    void findAll_empty() {
        when(repository.findAll()).thenReturn(List.of());
        assertThat(service.findAll()).isEmpty();
    }

    // ── findById ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("findById: retorna DTO quando categoria existe e está ativa")
    void findById_found() {
        when(repository.findById(1L)).thenReturn(Optional.of(category));

        var response = service.findById(1L);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("Tecidos Planos");
    }

    @Test
    @DisplayName("findById: lança ResourceNotFoundException quando não encontrada")
    void findById_notFound() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("findById: lança ResourceNotFoundException quando inativa")
    void findById_inactive_throwsNotFound() {
        category.deactivate();
        when(repository.findById(1L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> service.findById(1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── update ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("update: permite renomear para o mesmo nome (próprio ID)")
    void update_sameNameSameId_success() {
        var request = new CategoryDtos.Request("Tecidos Planos", "Nova descrição");
        when(repository.findById(1L)).thenReturn(Optional.of(category));
        when(repository.findByNameIgnoreCase("Tecidos Planos")).thenReturn(Optional.of(category));
        when(repository.save(any(Category.class))).thenReturn(category);

        var response = service.update(1L, request);

        assertThat(response).isNotNull();
        verify(repository).save(category);
    }

    @Test
    @DisplayName("update: lança ConflictException quando nome pertence a outra categoria")
    void update_nameConflictWithOther_throwsConflict() {
        var other = new Category();
        other.setId(2L);
        other.setName("Tecidos Planos");

        var request = new CategoryDtos.Request("Tecidos Planos", null);
        when(repository.findById(1L)).thenReturn(Optional.of(category));
        when(repository.findByNameIgnoreCase("Tecidos Planos")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> service.update(1L, request))
                .isInstanceOf(ConflictException.class);
    }

    // ── delete ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("delete: desativa (soft-delete) a categoria")
    void delete_deactivatesCategory() {
        when(repository.findById(1L)).thenReturn(Optional.of(category));

        service.delete(1L);

        assertThat(category.isActive()).isFalse();
        verify(repository).save(category);
    }

    @Test
    @DisplayName("delete: lança ResourceNotFoundException quando não existe")
    void delete_notFound() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
