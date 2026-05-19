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
        // Drop Hibernate 6 auto-generated enum check constraint on cash_movements.type
        // (needed when enum values were added after table creation)
        jdbcTemplate.execute("""
            DO $$ DECLARE cname TEXT;
            BEGIN
              SELECT tc.constraint_name INTO cname
              FROM information_schema.table_constraints tc
              JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
              WHERE tc.table_name = 'cash_movements'
                AND ccu.column_name = 'type'
                AND tc.constraint_type = 'CHECK'
              LIMIT 1;
              IF cname IS NOT NULL THEN
                EXECUTE 'ALTER TABLE cash_movements DROP CONSTRAINT ' || quote_ident(cname);
              END IF;
            END $$;
        """);
    }
}
