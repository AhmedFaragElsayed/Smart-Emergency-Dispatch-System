package com.emergency.dispatch.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

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
 @Column(name = "type")
 private String type;
 @Column(name = "reportedTime")
 private LocalDateTime reportedTime;
 @Column(name = "severityLevel")
 private String severityLevel;
 @Column(name = "status")
 private String status;
 @OneToMany(mappedBy = "incident")
 private List<Assignment> assignments = new ArrayList<>();
 @OneToMany(mappedBy = "incident")
 private List<Notification> notifications = new ArrayList<>();

}
