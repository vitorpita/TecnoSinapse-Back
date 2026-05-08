package com.gestaotecidos.api.domain;

import com.gestaotecidos.api.domain.Enums.PersonRole;
import com.gestaotecidos.api.domain.commun.BaseDomain;
import jakarta.persistence.*;
import org.hibernate.envers.Audited;

import java.util.Set;

@Entity
@Table(name = "persons")
@Audited
public class Person extends BaseDomain {

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String document;
    private String email;
    private String phone;

    @ElementCollection(targetClass = PersonRole.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "person_roles", joinColumns = @JoinColumn(name = "person_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Set<PersonRole> roles;

    public Person() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDocument() { return document; }
    public void setDocument(String document) { this.document = document; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public Set<PersonRole> getRoles() { return roles; }
    public void setRoles(Set<PersonRole> roles) { this.roles = roles; }
}