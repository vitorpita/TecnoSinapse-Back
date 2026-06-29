package com.gestaotecidos.api.domain.Enums;

import com.gestaotecidos.api.domain.Permission;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public enum Role {
    ADMIN(Set.of(
            Permission.USER_READ, Permission.USER_WRITE, Permission.USER_DELETE,
            Permission.PRODUCT_READ, Permission.PRODUCT_WRITE, Permission.PRODUCT_DELETE,
            Permission.CATEGORY_READ, Permission.CATEGORY_WRITE, Permission.CATEGORY_DELETE,
            Permission.PERSON_READ, Permission.PERSON_WRITE, Permission.PERSON_DELETE,
            Permission.ORDER_READ, Permission.ORDER_WRITE, Permission.ORDER_DELETE,
            Permission.ORDER_APPROVE, Permission.ORDER_INVOICE,
            Permission.PURCHASE_READ, Permission.PURCHASE_WRITE, Permission.PURCHASE_DELETE,
            Permission.PURCHASE_APPROVE, Permission.PURCHASE_RECEIVE, Permission.PURCHASE_FINALIZE, Permission.PURCHASE_CANCEL,
            Permission.CASH_READ, Permission.CASH_WRITE,
            Permission.REPORT_READ
    )),
    GERENTE(Set.of(
            Permission.PRODUCT_READ, Permission.PRODUCT_WRITE,
            Permission.CATEGORY_READ, Permission.CATEGORY_WRITE,
            Permission.PERSON_READ, Permission.PERSON_WRITE,
            Permission.ORDER_READ, Permission.ORDER_WRITE,
            Permission.ORDER_APPROVE, Permission.ORDER_INVOICE,
            Permission.PURCHASE_READ, Permission.PURCHASE_WRITE,
            Permission.PURCHASE_APPROVE, Permission.PURCHASE_RECEIVE, Permission.PURCHASE_FINALIZE, Permission.PURCHASE_CANCEL,
            Permission.CASH_READ, Permission.CASH_WRITE,
            Permission.REPORT_READ
    )),
    VENDEDOR(Set.of(
            Permission.USER_READ,
            Permission.PRODUCT_READ,
            Permission.CATEGORY_READ,
            Permission.PERSON_READ,
            Permission.ORDER_READ, Permission.ORDER_WRITE,
            Permission.CASH_READ, Permission.CASH_WRITE,
            Permission.REPORT_READ
    ));

    private final Set<Permission> permissions;

    Role(Set<Permission> permissions) {
        this.permissions = permissions;
    }

    public Set<Permission> getPermissions() {
        return permissions;
    }

    public List<SimpleGrantedAuthority> getAuthorities() {
        var authorities = getPermissions().stream()
                .map(permission -> new SimpleGrantedAuthority(permission.getPermission()))
                .collect(Collectors.toList());
        authorities.add(new SimpleGrantedAuthority("ROLE_" + this.name()));
        return authorities;
    }
}