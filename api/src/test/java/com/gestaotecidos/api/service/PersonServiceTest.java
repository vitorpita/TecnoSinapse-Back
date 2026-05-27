package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Person;
import com.gestaotecidos.api.domain.Enums.PersonRole;
import com.gestaotecidos.api.dto.PersonDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ConflictException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.PersonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PersonService")
class PersonServiceTest {

    @Mock
    PersonRepository repository;

    @InjectMocks
    PersonService service;

    private Person person;
    private PersonDtos.Request validRequest;

    @BeforeEach
    void setUp() {
        person = new Person();
        person.setId(1L);
        person.setName("João Silva");
        person.setDocument("12345678901");
        person.setEmail("joao@email.com");
        person.setRoles(Set.of(PersonRole.CLIENTE));

        validRequest = new PersonDtos.Request(
                "João Silva", "12345678901", "joao@email.com", null,
                Set.of(PersonRole.CLIENTE),
                null, null, null, null, null, null, null
        );
    }

    // ── create ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("create: salva pessoa com sucesso quando dados são válidos")
    void create_success() {
        when(repository.findByDocumentAndActiveTrue("12345678901")).thenReturn(Optional.empty());
        when(repository.save(any(Person.class))).thenReturn(person);

        var response = service.create(validRequest);

        assertThat(response.name()).isEqualTo("João Silva");
        assertThat(response.document()).isEqualTo("12345678901");
        verify(repository).save(any(Person.class));
    }

    @Test
    @DisplayName("create: lança BusinessException quando roles é vazio")
    void create_emptyRoles_throwsBusiness() {
        var request = new PersonDtos.Request(
                "João Silva", "123", null, null,
                Set.of(),
                null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("papel");

        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("create: lança BusinessException quando roles é nulo")
    void create_nullRoles_throwsBusiness() {
        var request = new PersonDtos.Request(
                "João Silva", "123", null, null,
                null,
                null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("create: lança ConflictException quando documento já existe ativo")
    void create_duplicateDocument_throwsConflict() {
        when(repository.findByDocumentAndActiveTrue("12345678901")).thenReturn(Optional.of(person));

        assertThatThrownBy(() -> service.create(validRequest))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("documento");

        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("create: permite cadastro sem documento")
    void create_withoutDocument_success() {
        var requestSemDoc = new PersonDtos.Request(
                "Maria", null, null, null,
                Set.of(PersonRole.CLIENTE),
                null, null, null, null, null, null, null
        );
        var personSemDoc = new Person();
        personSemDoc.setId(2L);
        personSemDoc.setName("Maria");
        personSemDoc.setRoles(Set.of(PersonRole.CLIENTE));
        when(repository.save(any(Person.class))).thenReturn(personSemDoc);

        var response = service.create(requestSemDoc);

        assertThat(response.name()).isEqualTo("Maria");
        verify(repository, never()).findByDocumentAndActiveTrue(any());
    }

    // ── update ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("update: atualiza pessoa com sucesso")
    void update_success() {
        when(repository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(person));
        when(repository.findByDocument("12345678901")).thenReturn(Optional.of(person));
        when(repository.save(any(Person.class))).thenReturn(person);

        var response = service.update(1L, validRequest);

        assertThat(response).isNotNull();
        verify(repository).save(person);
    }

    @Test
    @DisplayName("update: lança ConflictException quando documento pertence a outra pessoa")
    void update_documentBelongsToOther_throwsConflict() {
        var other = new Person();
        other.setId(2L);
        other.setDocument("12345678901");

        when(repository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(person));
        when(repository.findByDocument("12345678901")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> service.update(1L, validRequest))
                .isInstanceOf(ConflictException.class);
    }

    // ── delete ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("delete: desativa a pessoa (soft-delete)")
    void delete_deactivatesPerson() {
        when(repository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(person));

        service.delete(1L);

        assertThat(person.isActive()).isFalse();
        verify(repository).save(person);
    }

    // ── reactivate ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("reactivate: reativa pessoa inativa com sucesso")
    void reactivate_success() {
        person.deactivate();
        when(repository.findById(1L)).thenReturn(Optional.of(person));
        when(repository.findByDocumentAndActiveTrue("12345678901")).thenReturn(Optional.empty());
        when(repository.save(any(Person.class))).thenReturn(person);

        var response = service.reactivate(1L);

        assertThat(person.isActive()).isTrue();
        assertThat(response).isNotNull();
    }

    @Test
    @DisplayName("reactivate: lança BusinessException quando pessoa já está ativa")
    void reactivate_alreadyActive_throwsBusiness() {
        when(repository.findById(1L)).thenReturn(Optional.of(person));

        assertThatThrownBy(() -> service.reactivate(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ativo");
    }

    @Test
    @DisplayName("reactivate: lança ConflictException quando documento já existe em cadastro ativo diferente")
    void reactivate_documentConflict_throwsConflict() {
        person.deactivate();
        var other = new Person();
        other.setId(99L);
        other.setDocument("12345678901");

        when(repository.findById(1L)).thenReturn(Optional.of(person));
        when(repository.findByDocumentAndActiveTrue("12345678901")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> service.reactivate(1L))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("reactivate: lança ResourceNotFoundException quando não existe")
    void reactivate_notFound() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.reactivate(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
