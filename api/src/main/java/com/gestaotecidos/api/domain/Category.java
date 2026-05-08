package com.gestaotecidos.api.domain;


import jakarta.persistence.*;
import org.hibernate.envers.Audited;
import com.gestaotecidos.api.domain.commun.BaseDomain;

@Entity
@Table(name = "categories")
@Audited
public class Category extends BaseDomain {


    @Column(nullable = false, unique = true)
    private String name;
    public Category() {}
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}