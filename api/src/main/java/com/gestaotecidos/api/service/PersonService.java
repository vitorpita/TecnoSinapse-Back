package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Person;
import com.gestaotecidos.api.dto.PersonDtos;
import com.gestaotecidos.api.repository.PersonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PersonService {

    private final PersonRepository repository;

    public PersonService(PersonRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public PersonDtos.Response create(PersonDtos.Request data) {
        var person = new Person();
        updatePersonFromDto(person, data);
        person = repository.save(person);
        return mapToResponse(person);
    }

    @Transactional
    public PersonDtos.Response update(Long id, PersonDtos.Request data) {
        var person = findEntityById(id);
        updatePersonFromDto(person, data);
        person = repository.save(person);
        return mapToResponse(person);
    }

    public List<PersonDtos.Response> findAll() {
        return repository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
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
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pessoa não encontrada."));
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