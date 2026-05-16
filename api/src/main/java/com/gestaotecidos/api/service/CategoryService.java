package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Category;
import com.gestaotecidos.api.dto.CategoryDtos;
import com.gestaotecidos.api.exception.ConflictException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    private final CategoryRepository repository;

    public CategoryService(CategoryRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public CategoryDtos.Response create(CategoryDtos.Request data) {
        repository.findByNameIgnoreCase(data.name()).ifPresent(existing -> {
            throw new ConflictException("Já existe uma categoria com o nome '" + data.name() + "'.");
        });

        var category = new Category();
        category.setName(data.name());
        category.setDescription(data.description());
        category = repository.save(category);
        return mapToResponse(category);
    }

    public List<CategoryDtos.Response> findAll() {
        return repository.findAll().stream()
                .filter(Category::isActive)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public CategoryDtos.Response findById(Long id) {
        return mapToResponse(findEntityById(id));
    }

    @Transactional
    public CategoryDtos.Response update(Long id, CategoryDtos.Request data) {
        var category = findEntityById(id);

        repository.findByNameIgnoreCase(data.name()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new ConflictException("Já existe uma categoria com o nome '" + data.name() + "'.");
            }
        });

        category.setName(data.name());
        category.setDescription(data.description());
        category = repository.save(category);
        return mapToResponse(category);
    }

    @Transactional
    public void delete(Long id) {
        var category = findEntityById(id);
        category.deactivate();
        repository.save(category);
    }

    private Category findEntityById(Long id) {
        return repository.findById(id)
                .filter(Category::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria", id));
    }

    private CategoryDtos.Response mapToResponse(Category category) {
        return new CategoryDtos.Response(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.isActive()
        );
    }
}