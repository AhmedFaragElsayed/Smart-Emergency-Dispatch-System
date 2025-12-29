package com.emergency.dispatch.model;


import java.time.LocalDateTime;

import java.util.ArrayList;
import java.util.List;

import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.enums.IncidentType;
import com.emergency.dispatch.enums.SeverityLevel;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

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
@Table(name="Incident")
@Data
@JsonIgnoreProperties({"assignments", "notifications"})
public class Incident {

 @Id
 @GeneratedValue(strategy = GenerationType.IDENTITY)
 private Long incidentId;
 @Column(name = "latitude")
 private Double latitude;
 @Column(name = "longtitude")
 private Double longtitude;
 @Column(name = "Needs")
 private Integer needs;
 @Enumerated(EnumType.STRING)
 @Column(name = "type")
 private IncidentType type;
 @Column(name = "reportedTime")
 private Long reportedTime; // epoch ms
 @Enumerated(EnumType.STRING)
 @Column(name = "severityLevel")
 private SeverityLevel severityLevel;
 @Enumerated(EnumType.STRING)
 @Column(name = "status")
 private IncidentStatus status;
 @OneToMany(mappedBy = "incident")
 private List<Assignment> assignments = new ArrayList<>();
 @OneToMany(mappedBy = "incident")
 private List<Notification> notifications = new ArrayList<>();
 
}
