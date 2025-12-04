package com.emergency.dispatch.model;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Data
@Table (name = "Assignment")
public class Assignment {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)    
private Long assignmentId;
@Column(name = "resolutionTime")
private LocalDate resolutionTime;
@Column (name = "AssignmentTime")
private LocalDate assignmentTime;
@ManyToOne
@JoinColumn(name = "incidentId")
@JsonIgnoreProperties({"assignments", "notifications"})
private Incident incident;
@ManyToOne
@JoinColumn(name = "unit_id", referencedColumnName = "userid")
@JsonIgnoreProperties({"assignments", "notifications"})
private EmergencyUnit emergencyUnit;
@ManyToOne
@JoinColumn(name = "user_id", referencedColumnName = "userID", nullable = true)
@JsonIgnoreProperties({"assignments", "notifications"})
private User user;
@Column(name = "isActive")
private Boolean isActive;

}
