package com.gestaotecidos.api.domain.converter;

import com.gestaotecidos.api.domain.Enums.OrderStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class OrderStatusConverter implements AttributeConverter<OrderStatus, String> {

    @Override
    public String convertToDatabaseColumn(OrderStatus status) {
        return status == null ? null : status.name();
    }

    @Override
    public OrderStatus convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        return switch (dbData) {
            case "ORCAMENTO", "PENDENTE" -> OrderStatus.AGUARDANDO_APROVACAO;
            case "PAGO" -> OrderStatus.FATURADO;
            default -> OrderStatus.valueOf(dbData);
        };
    }
}
