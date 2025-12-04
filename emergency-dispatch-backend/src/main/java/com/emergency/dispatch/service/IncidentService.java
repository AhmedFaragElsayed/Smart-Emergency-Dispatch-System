package com.emergency.dispatch.service;


import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.model.Notification;
import com.emergency.dispatch.model.User;
import com.emergency.dispatch.repository.IncidentRepository;
import com.emergency.dispatch.repository.NotificationRepository;
import com.emergency.dispatch.repository.UserRepository;

@Service
public class IncidentService {

     @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private IncidentMonitorService monitorService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public Incident createIncident(Incident incident) {
        try {
            Incident savedIncident = incidentRepository.save(incident);
            
            // Broadcast the update to all monitoring clients
            monitorService.broadcastIncidentUpdate(savedIncident.getIncidentId());
            
            // Notify all admin users about the new incident
            notifyAdminsAboutNewIncident(savedIncident);
            
            return savedIncident;
        } catch (Exception e) {
            System.out.println("Error creating incident: " + e.getMessage());
            throw new RuntimeException("Failed to create incident: " + e.getMessage());
        }
    }

    private void notifyAdminsAboutNewIncident(Incident incident) {
        try {
            // Get all users with Admin role
            List<User> admins = userRepository.findAll().stream()
                    .filter(user -> "Admin".equalsIgnoreCase(user.getRole()))
                    .toList();
            
            System.out.println("Notifying " + admins.size() + " admin(s) about new incident #" + incident.getIncidentId());
            
            for (User admin : admins) {
                System.out.println("Creating notification for admin: " + admin.getUserName() + " (ID: " + admin.getUserID() + ")");
                
                // Create notification
                Notification notification = Notification.builder()
                        .user(admin)
                        .incident(incident)
                        .message("New " + incident.getType() + " incident #" + incident.getIncidentId() + " has been created")
                        .notificationTime(LocalDate.now())
                        .build();
                
                // Save notification to database
                Notification savedNotification = notificationRepository.save(notification);
                System.out.println("Notification saved with ID: " + savedNotification.getNotificationId());
                
                // Broadcast notification via WebSocket
                System.out.println("Broadcasting notification to /topic/notifications");
                messagingTemplate.convertAndSend("/topic/notifications", savedNotification);
                
                System.out.println("Notification broadcast complete for admin: " + admin.getUserName());
            }
        } catch (Exception e) {
            System.err.println("Error notifying admins: " + e.getMessage());
            e.printStackTrace();
            // Don't throw exception - notification failure shouldn't stop incident creation
        }
    }
        

    public Optional<Incident> getIncidentById(Long incidentId) {
        return incidentRepository.findById(incidentId);
    }

    public List<Incident> getAllIncidents() {
        return incidentRepository.findAll();
    }

    public Incident updateIncident(Long incidentId, Incident incidentDetails) {
        Incident updatedIncident = incidentRepository.findById(incidentId)
                .map(incident -> {
                    incident.setType(incidentDetails.getType());
                    incident.setLatitude(incidentDetails.getLatitude());
                    incident.setLongtitude(incidentDetails.getLongtitude());
                    incident.setNeeds(incidentDetails.getNeeds());
                    incident.setSeverityLevel(incidentDetails.getSeverityLevel());
                    incident.setReportedTime(incidentDetails.getReportedTime());
                    if (incidentDetails.getStatus() != null) {
                        incident.setStatus(incidentDetails.getStatus());
                    }
                    return incidentRepository.save(incident);
                })
                .orElseThrow(() -> new RuntimeException("Incident not found with id: " + incidentId));
        
        // Broadcast the update to all monitoring clients
        monitorService.broadcastIncidentUpdate(incidentId);
        return updatedIncident;
    }

    public void deleteIncident(Long incidentId) {
        if (incidentRepository.existsById(incidentId)) {
            incidentRepository.deleteById(incidentId);
            // Broadcast the deletion to all monitoring clients
            monitorService.broadcastIncidentDeletion(incidentId);
        } else {
            throw new RuntimeException("Incident not found with id: " + incidentId);
        }
    }

    public boolean incidentExists(Long incidentId) {
        return incidentRepository.existsById(incidentId);
    }

    public List<Incident> getIncidentsBySeverity(String severityLevel) {
        return incidentRepository.findAll().stream()
                .filter(incident -> severityLevel.equals(incident.getSeverityLevel()))
                .toList();
    }
}
