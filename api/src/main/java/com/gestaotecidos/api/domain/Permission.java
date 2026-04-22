package com.gestaotecidos.api.domain;

public enum Permission {
    USER_READ("user:read"),
    USER_WRITE("user:write"),
    USER_DELETE("user:delete"),
    PRODUCT_READ("product:read"),
    PRODUCT_WRITE("product:write"),
    PRODUCT_DELETE("product:delete"),
    CATEGORY_READ("category:read"),
    CATEGORY_WRITE("category:write"),
    CATEGORY_DELETE("category:delete"),
    PERSON_READ("person:read"),
    PERSON_WRITE("person:write"),
    PERSON_DELETE("person:delete"),
    ORDER_READ("order:read"),
    ORDER_WRITE("order:write"),
    ORDER_DELETE("order:delete"),
    PURCHASE_READ("purchase:read"),
    PURCHASE_WRITE("purchase:write"),
    PURCHASE_DELETE("purchase:delete"),
    CASH_READ("cash:read"),
    CASH_WRITE("cash:write"),
    REPORT_READ("report:read");

    private final String permission;

    Permission(String permission) {
        this.permission = permission;
    }

    public String getPermission() {
        return permission;
    }
}