package com.gestaotecidos.api.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseConstraintMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseConstraintMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute(
            "ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check"
        );
        jdbcTemplate.execute(
            "ALTER TABLE orders_aud DROP CONSTRAINT IF EXISTS orders_aud_status_check"
        );
    }
}
