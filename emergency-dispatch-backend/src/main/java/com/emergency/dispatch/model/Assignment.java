package com.emergency.dispatch.model;

import java.time.LocalDate;

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
private Incident incident;
   @ManyToOne
   @JoinColumn(name = "unit_id", referencedColumnName = "userid")
   private EmergencyUnit emergencyUnit;
   @ManyToOne
   @JoinColumn(name = "user_id", referencedColumnName = "userID")
   private User user;

}
