package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Person;
import com.gestaotecidos.api.domain.Enums.PersonRole;
import com.gestaotecidos.api.dto.PersonDtos;
import com.gestaotecidos.api.exception.ConflictException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.repository.PersonRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PersonService {

    private final PersonRepository repository;

    public PersonService(PersonRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public PersonDtos.Response create(PersonDtos.Request data) {
        // Validar que roles não é nulo ou vazio
        if (data.roles() == null || data.roles().isEmpty()) {
            throw new BusinessException("Pelo menos um papel (role) deve ser atribuído à pessoa.");
        }

        if (data.document() != null && !data.document().isBlank()) {
            repository.findByDocument(data.document()).ifPresent(existing -> {
                throw new ConflictException("Já existe um cadastro com este documento (CPF/CNPJ).");
            });
        }

        var person = new Person();
        updatePersonFromDto(person, data);
        return mapToResponse(repository.save(person));
    }

    @Transactional
    public PersonDtos.Response update(Long id, PersonDtos.Request data) {
        // Validar que roles não é nulo ou vazio
        if (data.roles() == null || data.roles().isEmpty()) {
            throw new BusinessException("Pelo menos um papel (role) deve ser atribuído à pessoa.");
        }

        var person = findEntityById(id);

        if (data.document() != null && !data.document().isBlank()) {
            repository.findByDocument(data.document()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new ConflictException("Já existe um cadastro com este documento (CPF/CNPJ).");
                }
            });
        }

        updatePersonFromDto(person, data);
        return mapToResponse(repository.save(person));
    }

    public Page<PersonDtos.Response> findAll(String search, Pageable pageable) {
        if (search != null && !search.isBlank()) {
            return repository.searchByNameOrDocument(search.trim(), pageable).map(this::mapToResponse);
        }
        return repository.findByActiveTrue(pageable).map(this::mapToResponse);
    }

    public Page<PersonDtos.Response> findByRole(PersonRole role, String search, Pageable pageable) {
        if (search != null && !search.isBlank()) {
            return repository.searchByRoleAndNameOrDocument(role, search.trim(), pageable).map(this::mapToResponse);
        }
        return repository.findByRoleAndActiveTrue(role, pageable).map(this::mapToResponse);
    }

    public PersonDtos.Response findById(Long id) {
        return mapToResponse(findEntityById(id));
    }

    @Transactional
    public void delete(Long id) {
        var person = findEntityById(id);
        person.deactivate();
        repository.save(person);
    }

    private Person findEntityById(Long id) {
        return repository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pessoa", id));
    }

    private void updatePersonFromDto(Person person, PersonDtos.Request data) {
        person.setName(data.name());
        person.setDocument(data.document());
        person.setEmail(data.email());
        person.setPhone(data.phone());
        person.setRoles(data.roles());
        person.setCep(data.cep());
        person.setLogradouro(data.logradouro());
        person.setNumero(data.numero());
        person.setBairro(data.bairro());
        person.setCidade(data.cidade());
        person.setEstado(data.estado());
    }

    private PersonDtos.Response mapToResponse(Person person) {
        return new PersonDtos.Response(
                person.getId(),
                person.getName(),
                person.getDocument(),
                person.getEmail(),
                person.getPhone(),
                person.getRoles(),
                person.isActive(),
                person.getCep(),
                person.getLogradouro(),
                person.getNumero(),
                person.getBairro(),
                person.getCidade(),
                person.getEstado()
        );
    }
}