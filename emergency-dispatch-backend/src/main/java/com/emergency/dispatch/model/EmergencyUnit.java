package com.emergency.dispatch.model;

import java.util.ArrayList;
import java.util.List;

import com.emergency.dispatch.enums.EmergencyUnitType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Table(name="EmergencyUnit")
@Data
@JsonIgnoreProperties({"assignments", "notifications"})
public class EmergencyUnit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "userid")
    private Long unitID;
    @Column(name = "latitude")
    private Double latitude;
    @Column (name ="longtitude")
    private Double longtitude;
    @Column (name = "capacity")
    private Integer capacity;
    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private EmergencyUnitType type;
    @Column(name = "status")
    private Boolean status;
    @OneToMany(mappedBy = "emergencyUnit", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Assignment> assignments = new ArrayList<>();
    @OneToMany(mappedBy = "emergencyUnit", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Notification> notifications = new ArrayList<>();

}
