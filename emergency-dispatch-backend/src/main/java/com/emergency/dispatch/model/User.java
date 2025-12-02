package com.emergency.dispatch.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Data
@Table(name = "user")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userID;
    @Column(name ="username")
    private String userName;
    @Column (name = "fname")
    private String fname;
    @Column (name = "lname")
    private String lname;
    @Column (name= "password")
    private String password;
    @Column (name ="role")
    private String role;
    @OneToMany(mappedBy = "user")
    private List<Assignment> assignments = new ArrayList<>();
    @OneToMany(mappedBy = "user")
    private List<Notification> notifications = new ArrayList<>();

}
