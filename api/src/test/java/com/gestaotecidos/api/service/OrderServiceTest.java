package com.gestaotecidos.api.service;

import com.gestaotecidos.api.domain.*;
import com.gestaotecidos.api.domain.Enums.*;
import com.gestaotecidos.api.dto.OrderDtos;
import com.gestaotecidos.api.exception.BusinessException;
import com.gestaotecidos.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderService")
class OrderServiceTest {

    @Mock OrderRepository orderRepository;
    @Mock PersonRepository personRepository;
    @Mock UserRepository userRepository;
    @Mock ProductRepository productRepository;
    @Mock FinancialInstallmentService installmentService;
    @Mock CashRegisterRepository cashRegisterRepository;
    @Mock CashMovementRepository cashMovementRepository;
    @Mock StockMovementRepository stockMovementRepository;

    @InjectMocks
    OrderService service;

    private CashRegister openCashRegister;
    private Person client;
    private User seller;
    private Product product;
    private Order order;

    @BeforeEach
    void setUp() {
        openCashRegister = new CashRegister();
        openCashRegister.setId(1L);
        openCashRegister.setOpeningBalance(BigDecimal.ZERO);

        client = new Person();
        client.setId(1L);
        client.setName("Cliente Teste");
        client.setRoles(java.util.Set.of(PersonRole.CLIENTE));

        seller = new User();
        seller.setId(1L);
        seller.setName("Vendedor Teste");

        product = new Product();
        product.setId(1L);
        product.setName("Tecido A");
        product.setStockQuantity(new BigDecimal("50.00"));
        product.setUnitPrice(new BigDecimal("10.00"));
        product.setCategory(new Category());

        order = new Order();
        order.setId(1L);
        order.setStatus(OrderStatus.DIGITACAO);
        order.setClient(client);
        order.setSeller(seller);
        order.setPaymentMethod(PaymentMethod.BOLETO);
        order.setPaymentCondition("30");
        order.setTotalAmount(new BigDecimal("100.00"));
    }

    // ── create ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("create: lança BusinessException quando não há caixa aberto")
    void create_noCashRegister_throwsBusiness() {
        when(cashRegisterRepository.findOpenRegister()).thenReturn(Optional.empty());

        var req = makeRequest();
        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("caixa");
    }

    @Test
    @DisplayName("create: lança BusinessException quando cliente não tem papel CLIENTE")
    void create_personNotClient_throwsBusiness() {
        client.setRoles(java.util.Set.of(PersonRole.FORNECEDOR));
        when(cashRegisterRepository.findOpenRegister()).thenReturn(Optional.of(openCashRegister));
        when(productRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(product));
        when(personRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(client));

        assertThatThrownBy(() -> service.create(makeRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("CLIENTE");
    }

    @Test
    @DisplayName("create: lança BusinessException quando estoque insuficiente")
    void create_insufficientStock_throwsBusiness() {
        product.setStockQuantity(new BigDecimal("1.00"));
        when(cashRegisterRepository.findOpenRegister()).thenReturn(Optional.of(openCashRegister));
        when(productRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> service.create(makeRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Estoque insuficiente");
    }

    // ── approve ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("approve: muda status para APROVADO a partir de DIGITACAO")
    void approve_fromDigitacao_success() {
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);

        var response = service.approve(1L);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.APROVADO);
    }

    @Test
    @DisplayName("approve: muda status para APROVADO a partir de AGUARDANDO_APROVACAO")
    void approve_fromAguardandoAprovacao_success() {
        order.setStatus(OrderStatus.AGUARDANDO_APROVACAO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);

        service.approve(1L);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.APROVADO);
    }

    @Test
    @DisplayName("approve: lança BusinessException quando pedido está FATURADO")
    void approve_fromFaturado_throwsBusiness() {
        order.setStatus(OrderStatus.FATURADO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.approve(1L))
                .isInstanceOf(BusinessException.class);
    }

    // ── awaitApproval ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("awaitApproval: muda status para AGUARDANDO_APROVACAO a partir de DIGITACAO")
    void awaitApproval_success() {
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);

        service.awaitApproval(1L);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.AGUARDANDO_APROVACAO);
    }

    @Test
    @DisplayName("awaitApproval: lança BusinessException quando status não é DIGITACAO")
    void awaitApproval_notDigitacao_throwsBusiness() {
        order.setStatus(OrderStatus.APROVADO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.awaitApproval(1L))
                .isInstanceOf(BusinessException.class);
    }

    // ── faturar ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("faturar: lança BusinessException quando pedido não está APROVADO")
    void faturar_notApproved_throwsBusiness() {
        order.setStatus(OrderStatus.DIGITACAO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.faturar(1L, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("APROVADOS");
    }

    @Test
    @DisplayName("faturar: lança BusinessException quando não há caixa aberto")
    void faturar_noCashRegister_throwsBusiness() {
        order.setStatus(OrderStatus.APROVADO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(cashRegisterRepository.findOpenRegister()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.faturar(1L, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("caixa");
    }

    @Test
    @DisplayName("faturar: lança BusinessException quando forma de pagamento é nula")
    void faturar_noPaymentMethod_throwsBusiness() {
        order.setStatus(OrderStatus.APROVADO);
        order.setPaymentMethod(null);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(cashRegisterRepository.findOpenRegister()).thenReturn(Optional.of(openCashRegister));

        assertThatThrownBy(() -> service.faturar(1L, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("forma de pagamento");
    }

    @Test
    @DisplayName("faturar: decrementa estoque e muda status para FATURADO")
    void faturar_decrementsStockAndChangesStatus() {
        order.setStatus(OrderStatus.APROVADO);
        var item = new OrderItem(product, new BigDecimal("5.00"), new BigDecimal("10.00"));
        order.addItem(item);

        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(cashRegisterRepository.findOpenRegister()).thenReturn(Optional.of(openCashRegister));
        when(productRepository.save(any())).thenReturn(product);
        when(orderRepository.save(any())).thenReturn(order);
        when(stockMovementRepository.save(any())).thenReturn(new StockMovement());
        when(cashMovementRepository.save(any())).thenReturn(new CashMovement());

        service.faturar(1L, null);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.FATURADO);
        assertThat(product.getStockQuantity()).isEqualByComparingTo("45.00");
        verify(installmentService).generateForOrder(order);
        verify(cashMovementRepository).save(any(CashMovement.class));
    }

    @Test
    @DisplayName("faturar: lança BusinessException quando estoque insuficiente ao faturar")
    void faturar_insufficientStock_throwsBusiness() {
        order.setStatus(OrderStatus.APROVADO);
        product.setStockQuantity(new BigDecimal("2.00"));
        var item = new OrderItem(product, new BigDecimal("10.00"), new BigDecimal("10.00"));
        order.addItem(item);

        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(cashRegisterRepository.findOpenRegister()).thenReturn(Optional.of(openCashRegister));

        assertThatThrownBy(() -> service.faturar(1L, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Estoque insuficiente");
    }

    // ── cancel ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("cancel: cancela pedido em DIGITACAO sem reverter estoque")
    void cancel_fromDigitacao_noCancelsInstallments() {
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);

        service.cancel(1L);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELADO);
        verify(installmentService, never()).cancelByOrder(any());
    }

    @Test
    @DisplayName("cancel: reverte estoque e cancela parcelas quando pedido está FATURADO")
    void cancel_fromFaturado_revertsStock() {
        order.setStatus(OrderStatus.FATURADO);
        var item = new OrderItem(product, new BigDecimal("5.00"), new BigDecimal("10.00"));
        order.addItem(item);
        product.setStockQuantity(new BigDecimal("45.00"));

        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(productRepository.save(any())).thenReturn(product);
        when(orderRepository.save(any())).thenReturn(order);

        service.cancel(1L);

        assertThat(product.getStockQuantity()).isEqualByComparingTo("50.00");
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELADO);
        verify(installmentService).cancelByOrder(1L);
    }

    @Test
    @DisplayName("cancel: lança BusinessException quando pedido já foi CANCELADO")
    void cancel_alreadyCancelled_throwsBusiness() {
        order.setStatus(OrderStatus.CANCELADO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cancelado");
    }

    @Test
    @DisplayName("cancel: lança BusinessException quando pedido já foi ENTREGUE")
    void cancel_delivered_throwsBusiness() {
        order.setStatus(OrderStatus.ENTREGUE);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("entregue");
    }

    // ── ship / deliver ────────────────────────────────────────────────────────

    @Test
    @DisplayName("ship: muda status para ENVIADO a partir de FATURADO")
    void ship_fromFaturado_success() {
        order.setStatus(OrderStatus.FATURADO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);

        service.ship(1L);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.ENVIADO);
    }

    @Test
    @DisplayName("ship: lança BusinessException quando status não é FATURADO")
    void ship_notFaturado_throwsBusiness() {
        order.setStatus(OrderStatus.APROVADO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.ship(1L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("deliver: muda status para ENTREGUE a partir de ENVIADO")
    void deliver_fromEnviado_success() {
        order.setStatus(OrderStatus.ENVIADO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);

        service.deliver(1L);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.ENTREGUE);
    }

    @Test
    @DisplayName("deliver: lança BusinessException quando status não é ENVIADO")
    void deliver_notEnviado_throwsBusiness() {
        order.setStatus(OrderStatus.FATURADO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.deliver(1L))
                .isInstanceOf(BusinessException.class);
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("delete: desativa pedido quando está em DIGITACAO")
    void delete_digitacao_deactivates() {
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));

        service.delete(1L);

        assertThat(order.isActive()).isFalse();
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("delete: lança BusinessException quando pedido não está em DIGITACAO")
    void delete_notDigitacao_throwsBusiness() {
        order.setStatus(OrderStatus.APROVADO);
        when(orderRepository.findByIdActive(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("DIGITAÇÃO");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private OrderDtos.Request makeRequest() {
        var req = new OrderDtos.Request();
        req.clientId = 1L;
        req.sellerId = 1L;
        req.paymentMethod = PaymentMethod.BOLETO;
        req.paymentCondition = "30";
        req.items = List.of(new OrderDtos.OrderItemRequest(1L, new BigDecimal("5.00"), new BigDecimal("10.00")));
        return req;
    }
}
