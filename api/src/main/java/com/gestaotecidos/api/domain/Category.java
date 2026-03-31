package com.gestaotecidos.api.domain;

import jakarta.persistence.*;
import org.hibernate.envers.Audited;

@Entity
@Table(name = "categories")
@Audited
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    public Category() {}
    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}