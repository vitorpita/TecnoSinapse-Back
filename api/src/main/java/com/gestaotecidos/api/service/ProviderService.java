package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Provider;
import com.gestaotecidos.api.dto.ProviderDtos;
import com.gestaotecidos.api.repository.ProviderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProviderService {

    private final ProviderRepository repository;

    public ProviderService(ProviderRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Provider create(ProviderDtos.Request data) {
        if (repository.findByCnpj(data.cnpj()).isPresent()) {
            throw new RuntimeException("CNPJ já cadastrado no sistema.");
        }

        var provider = new Provider();
        updateProviderFromDto(provider, data);

        return repository.save(provider);
    }

    @Transactional
    public Provider update(Long id, ProviderDtos.Request data) {
        var provider = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fornecedor não encontrado."));

        updateProviderFromDto(provider, data);
        return repository.save(provider);
    }

    public List<Provider> findAll() {
        return repository.findAll();
    }

    public Provider findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fornecedor não encontrado."));
    }

    @Transactional
    public void delete(Long id) {
        var provider = findById(id);
        repository.delete(provider);
    }

    private void updateProviderFromDto(Provider provider, ProviderDtos.Request data) {
        provider.setName(data.name());
        provider.setCnpj(data.cnpj());
        provider.setPhone(data.phone());
        provider.setEmail(data.email());
        provider.setCep(data.cep());
        provider.setStreet(data.street());
        provider.setNumber(data.number());
        provider.setComplement(data.complement());
        provider.setNeighborhood(data.neighborhood());
        provider.setCity(data.city());
        provider.setState(data.state());
    }
}