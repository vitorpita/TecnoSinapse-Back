package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Person;
import com.gestaotecidos.api.dto.PersonDtos;
import com.gestaotecidos.api.exception.ConflictException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
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
        if (data.document() != null && !data.document().isBlank()) {
            repository.findByDocumentAndActiveTrue(data.document()).ifPresent(existing -> {
                throw new ConflictException("Já existe uma pessoa cadastrada com o documento '" + data.document() + "'.");
            });
        }

        var person = new Person();
        updatePersonFromDto(person, data);
        return mapToResponse(repository.save(person));
    }

    @Transactional
    public PersonDtos.Response update(Long id, PersonDtos.Request data) {
        var person = findEntityById(id);

        if (data.document() != null && !data.document().isBlank()) {
            repository.findByDocumentAndActiveTrue(data.document()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new ConflictException("Já existe uma pessoa cadastrada com o documento '" + data.document() + "'.");
                }
            });
        }

        updatePersonFromDto(person, data);
        return mapToResponse(repository.save(person));
    }

    public Page<PersonDtos.Response> findAll(Pageable pageable) {
        return repository.findByActiveTrue(pageable).map(this::mapToResponse);
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
    }

    private PersonDtos.Response mapToResponse(Person person) {
        return new PersonDtos.Response(
                person.getId(),
                person.getName(),
                person.getDocument(),
                person.getEmail(),
                person.getPhone(),
                person.getRoles(),
                person.isActive()
        );
    }
}