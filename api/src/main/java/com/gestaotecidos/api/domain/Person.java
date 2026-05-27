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
    private String cep;
    private String logradouro;
    private String numero;
    private String bairro;
    private String cidade;

    @Column(length = 2)
    private String estado;

    @Column(length = 20)
    private String stateRegistration;

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
    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }
    public String getLogradouro() { return logradouro; }
    public void setLogradouro(String logradouro) { this.logradouro = logradouro; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }
    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getStateRegistration() { return stateRegistration; }
    public void setStateRegistration(String stateRegistration) { this.stateRegistration = stateRegistration; }
    public Set<PersonRole> getRoles() { return roles; }
    public void setRoles(Set<PersonRole> roles) { this.roles = roles; }
}