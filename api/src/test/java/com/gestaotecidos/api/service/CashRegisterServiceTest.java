package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.CashMovement;
import com.gestaotecidos.api.domain.CashRegister;
import com.gestaotecidos.api.domain.User;
import com.gestaotecidos.api.domain.Enums.CashMovementType;
import com.gestaotecidos.api.dto.CashRegisterDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.exception.ResourceNotFoundException;
import com.gestaotecidos.api.repository.CashRegisterRepository;
import com.gestaotecidos.api.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CashRegisterService")
class CashRegisterServiceTest {

    @Mock CashRegisterRepository repository;
    @Mock OrderRepository orderRepository;

    @InjectMocks
    CashRegisterService service;

    private User user;
    private CashRegister cashRegister;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setName("Operador");

        cashRegister = new CashRegister();
        cashRegister.setId(1L);
        cashRegister.setOpenedBy(user);
        cashRegister.setOpeningBalance(new BigDecimal("500.00"));
        cashRegister.setOpenedAt(LocalDateTime.now());
    }

    // ── open ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("open: abre caixa com sucesso quando não há caixa aberto")
    void open_success() {
        when(repository.findOpenRegister()).thenReturn(Optional.empty());
        when(repository.save(any(CashRegister.class))).thenReturn(cashRegister);

        var request = new CashRegisterDtos.OpenRequest(new BigDecimal("500.00"), "Abertura turno");
        var response = service.open(request, user);

        assertThat(response).isNotNull();
        verify(repository).save(any(CashRegister.class));
    }

    @Test
    @DisplayName("open: lança BusinessException quando já existe caixa aberto")
    void open_alreadyOpen_throwsBusiness() {
        when(repository.findOpenRegister()).thenReturn(Optional.of(cashRegister));

        var request = new CashRegisterDtos.OpenRequest(BigDecimal.ZERO, null);
        assertThatThrownBy(() -> service.open(request, user))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("caixa aberto");
    }

    // ── close ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("close: fecha caixa aberto com sucesso")
    void close_success() {
        when(repository.findByIdWithMovements(1L)).thenReturn(Optional.of(cashRegister));
        when(repository.save(any())).thenReturn(cashRegister);

        var request = new CashRegisterDtos.CloseRequest(new BigDecimal("600.00"), "Fechamento");
        service.close(1L, request, user);

        assertThat(cashRegister.isClosed()).isTrue();
        assertThat(cashRegister.getClosedBy()).isEqualTo(user);
        assertThat(cashRegister.getClosingBalance()).isEqualByComparingTo("600.00");
    }

    @Test
    @DisplayName("close: lança BusinessException quando caixa já está fechado")
    void close_alreadyClosed_throwsBusiness() {
        cashRegister.setClosedAt(LocalDateTime.now());
        when(repository.findByIdWithMovements(1L)).thenReturn(Optional.of(cashRegister));

        assertThatThrownBy(() -> service.close(1L, new CashRegisterDtos.CloseRequest(BigDecimal.ZERO, null), user))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("fechado");
    }

    @Test
    @DisplayName("close: lança ResourceNotFoundException quando caixa não existe")
    void close_notFound() {
        when(repository.findByIdWithMovements(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.close(99L, new CashRegisterDtos.CloseRequest(BigDecimal.ZERO, null), user))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── addMovement ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("addMovement: adiciona movimentação em caixa aberto")
    void addMovement_success() {
        when(repository.findByIdWithMovements(1L)).thenReturn(Optional.of(cashRegister));
        when(repository.save(any())).thenReturn(cashRegister);

        var request = new CashRegisterDtos.MovementRequest(
                CashMovementType.ENTRADA, new BigDecimal("100.00"), "Suprimento", null);
        service.addMovement(1L, request);

        assertThat(cashRegister.getMovements()).hasSize(1);
        verify(repository).save(cashRegister);
    }

    @Test
    @DisplayName("addMovement: lança BusinessException quando caixa está fechado")
    void addMovement_closedRegister_throwsBusiness() {
        cashRegister.setClosedAt(LocalDateTime.now());
        when(repository.findByIdWithMovements(1L)).thenReturn(Optional.of(cashRegister));

        var request = new CashRegisterDtos.MovementRequest(
                CashMovementType.ENTRADA, new BigDecimal("50.00"), "test", null);
        assertThatThrownBy(() -> service.addMovement(1L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("fechado");
    }

    // ── deleteMovement ────────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteMovement: remove movimentação existente de caixa aberto")
    void deleteMovement_success() {
        var movement = new CashMovement();
        movement.setId(10L);
        cashRegister.getMovements().add(movement);

        when(repository.findByIdWithMovements(1L)).thenReturn(Optional.of(cashRegister));
        when(repository.save(any())).thenReturn(cashRegister);

        service.deleteMovement(1L, 10L);

        assertThat(cashRegister.getMovements()).isEmpty();
    }

    @Test
    @DisplayName("deleteMovement: lança BusinessException quando caixa está fechado")
    void deleteMovement_closedRegister_throwsBusiness() {
        cashRegister.setClosedAt(LocalDateTime.now());
        when(repository.findByIdWithMovements(1L)).thenReturn(Optional.of(cashRegister));

        assertThatThrownBy(() -> service.deleteMovement(1L, 10L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("fechado");
    }

    @Test
    @DisplayName("deleteMovement: lança ResourceNotFoundException quando movimentação não existe")
    void deleteMovement_movementNotFound() {
        when(repository.findByIdWithMovements(1L)).thenReturn(Optional.of(cashRegister));

        assertThatThrownBy(() -> service.deleteMovement(1L, 999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── cálculo de saldos (mapToResponse) ────────────────────────────────────

    @Test
    @DisplayName("findById: calcula totalIn, totalOut, totalSangrias e expectedBalance corretamente")
    void findById_calculatesBalancesCorrectly() {
        var entrada = buildMovement(CashMovementType.ENTRADA, "200.00");
        var recebimento = buildMovement(CashMovementType.RECEBIMENTO, "300.00");
        var saida = buildMovement(CashMovementType.SAIDA, "50.00");
        var sangria = buildMovement(CashMovementType.SANGRIA, "100.00");

        cashRegister.getMovements().addAll(java.util.List.of(entrada, recebimento, saida, sangria));
        cashRegister.setClosingBalance(new BigDecimal("850.00"));
        cashRegister.setClosedAt(LocalDateTime.now());
        cashRegister.setClosedBy(user);

        when(repository.findByIdWithMovements(1L)).thenReturn(Optional.of(cashRegister));

        var response = service.findById(1L);

        // totalIn = ENTRADA(200) + RECEBIMENTO(300) = 500
        assertThat(response.totalIn()).isEqualByComparingTo("500.00");
        // totalOut = SAIDA(50)
        assertThat(response.totalOut()).isEqualByComparingTo("50.00");
        // totalSangrias = SANGRIA(100)
        assertThat(response.totalSangrias()).isEqualByComparingTo("100.00");
        // expectedBalance = openingBalance(500) + totalIn(500) - totalOut(50) - sangrias(100) = 850
        assertThat(response.expectedBalance()).isEqualByComparingTo("850.00");
        // difference = closing(850) - expected(850) = 0
        assertThat(response.balanceDifference()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("findById: balanceDifference é null quando caixa ainda está aberto")
    void findById_openRegister_noDifference() {
        when(repository.findByIdWithMovements(1L)).thenReturn(Optional.of(cashRegister));

        var response = service.findById(1L);

        assertThat(response.balanceDifference()).isNull();
    }

    // ── helper ───────────────────────────────────────────────────────────────

    private CashMovement buildMovement(CashMovementType type, String amount) {
        var m = new CashMovement();
        m.setId((long) (Math.random() * 1000));
        m.setType(type);
        m.setAmount(new BigDecimal(amount));
        m.setCashRegister(cashRegister);
        return m;
    }
}
