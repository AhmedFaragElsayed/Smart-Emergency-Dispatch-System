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
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Table(name = "Notification")
@JsonIgnoreProperties("hibernateLazyInitializer")
public class Notification {
    
   @Id
   @GeneratedValue(strategy = GenerationType.IDENTITY)
   private Long notificationId;
   
   @Column(name = "notification_time")
   private LocalDate notificationTime;

   @ManyToOne
   @JoinColumn(name = "unit_id", referencedColumnName = "userid")
   private EmergencyUnit emergencyUnit;

   @ManyToOne
   @JoinColumn(name = "incident_id")
   private Incident incident;
   
   @ManyToOne
   @JoinColumn(name = "user_id", referencedColumnName = "userID", nullable = true)
   private User user;
   
   @Column(name = "message")
   private String message;
}
