package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.Category;
import com.gestaotecidos.api.domain.Product;
import com.gestaotecidos.api.dto.ProductDtos;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CategoryRepository;
import com.gestaotecidos.api.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProductService")
class ProductServiceTest {

    @Mock
    ProductRepository repository;

    @Mock
    CategoryRepository categoryRepository;

    @InjectMocks
    ProductService service;

    private Category category;
    private Product product;
    // Request(name, sku, color, composition, weightGsm, width, imgUrl, stockQuantity, unitPrice, purchasePrice, categoryId, providerId)
    private ProductDtos.Request request;

    @BeforeEach
    void setUp() {
        category = new Category();
        category.setId(1L);
        category.setName("Tecidos");

        product = new Product();
        product.setId(10L);
        product.setName("Oxford Lisa");
        product.setSku(null);
        product.setStockQuantity(new BigDecimal("100.00"));
        product.setUnitPrice(new BigDecimal("25.00"));
        product.setPurchasePrice(new BigDecimal("15.00"));
        product.setCategory(category);

        request = new ProductDtos.Request(
                "Oxford Lisa", null, null, null, null, null, null,
                new BigDecimal("100.00"), new BigDecimal("25.00"), new BigDecimal("15.00"),
                1L, null
        );
    }

    // ── create ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("create: gera SKU automaticamente no formato SKU-XXXXX quando SKU é nulo")
    void create_autoGeneratesSku() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(repository.save(any(Product.class))).thenAnswer(inv -> {
            Product p = inv.getArgument(0);
            p.setId(10L);
            return p;
        });

        service.create(request);

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(repository, atLeastOnce()).save(captor.capture());
        String generatedSku = captor.getAllValues().stream()
                .map(Product::getSku)
                .filter(s -> s != null)
                .findFirst()
                .orElse(null);

        assertThat(generatedSku).matches("SKU-\\d{5}");
        assertThat(generatedSku).isEqualTo("SKU-00010");
    }

    @Test
    @DisplayName("create: não sobrescreve SKU quando fornecido explicitamente")
    void create_preservesExplicitSku() {
        var reqWithSku = new ProductDtos.Request(
                "Oxford Lisa", "CUSTOM-001", null, null, null, null, null,
                new BigDecimal("100.00"), new BigDecimal("25.00"), new BigDecimal("15.00"),
                1L, null
        );
        product.setSku("CUSTOM-001");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(repository.save(any(Product.class))).thenReturn(product);

        var response = service.create(reqWithSku);

        assertThat(response.sku()).isEqualTo("CUSTOM-001");
        verify(repository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("create: lança ResourceNotFoundException quando categoria não existe")
    void create_categoryNotFound() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(repository, never()).save(any());
    }

    // ── getNextSku ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getNextSku: retorna SKU-00001 quando não há produtos")
    void getNextSku_noProducts() {
        when(repository.findMaxId()).thenReturn(0L);

        assertThat(service.getNextSku()).isEqualTo("SKU-00001");
    }

    @Test
    @DisplayName("getNextSku: retorna SKU seguinte ao maior ID existente")
    void getNextSku_withExistingProducts() {
        when(repository.findMaxId()).thenReturn(41L);

        assertThat(service.getNextSku()).isEqualTo("SKU-00042");
    }

    // ── update ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("update: atualiza produto com sucesso")
    void update_success() {
        when(repository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(repository.save(any(Product.class))).thenReturn(product);

        var response = service.update(10L, request);

        assertThat(response).isNotNull();
        verify(repository).save(product);
    }

    @Test
    @DisplayName("update: preserva SKU existente quando request não traz SKU")
    void update_preservesSkuWhenNotProvided() {
        product.setSku("SKU-00010");

        when(repository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(repository.save(any(Product.class))).thenReturn(product);

        service.update(10L, request); // request sem SKU (null)

        assertThat(product.getSku()).isEqualTo("SKU-00010");
    }

    @Test
    @DisplayName("update: lança ResourceNotFoundException quando produto não existe")
    void update_notFound() {
        when(repository.findByIdAndActiveTrue(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99L, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── delete ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("delete: desativa produto (soft-delete)")
    void delete_deactivatesProduct() {
        when(repository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));

        service.delete(10L);

        assertThat(product.isActive()).isFalse();
        verify(repository).save(product);
    }

    @Test
    @DisplayName("delete: lança ResourceNotFoundException quando produto não existe")
    void delete_notFound() {
        when(repository.findByIdAndActiveTrue(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── findById ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("findById: retorna DTO correto quando produto existe")
    void findById_found() {
        when(repository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));

        var response = service.findById(10L);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.name()).isEqualTo("Oxford Lisa");
    }
}
