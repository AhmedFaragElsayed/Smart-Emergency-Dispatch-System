package com.emergency.dispatch.service;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.model.Notification;
import com.emergency.dispatch.model.User;
import com.emergency.dispatch.repository.EmergencyUnitRepository;
import com.emergency.dispatch.repository.IncidentRepository;
import com.emergency.dispatch.repository.NotificationRepository;
import com.emergency.dispatch.repository.UserRepository;



@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private EmergencyUnitRepository emergencyUnitRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public Notification sendNotification(Notification notification) {
        // Validate that all required foreign key entities exist
        EmergencyUnit emergencyUnit = null;
        Incident incident = null;
        User user = null;
        
        // Validate EmergencyUnit (optional - can be null)
        if (notification.getEmergencyUnit() != null && notification.getEmergencyUnit().getUnitID() != null) {
            emergencyUnit = emergencyUnitRepository.findById(notification.getEmergencyUnit().getUnitID())
                    .orElseThrow(() -> new RuntimeException("EmergencyUnit with ID " + 
                            notification.getEmergencyUnit().getUnitID() + " does not exist. Please create it first."));
        }
        
        // Validate Incident (optional - can be null)
        if (notification.getIncident() != null && notification.getIncident().getIncidentId() != null) {
            incident = incidentRepository.findById(notification.getIncident().getIncidentId())
                    .orElseThrow(() -> new RuntimeException("Incident with ID " + 
                            notification.getIncident().getIncidentId() + " does not exist. Please create it first."));
        }
        
        // Validate User exists (required)
        if (notification.getUser() != null && notification.getUser().getUserID() != null) {
            user = userRepository.findById(notification.getUser().getUserID())
                    .orElseThrow(() -> new RuntimeException("User with ID " + 
                            notification.getUser().getUserID() + " does not exist. Please create it first."));
        } else {
            throw new RuntimeException("User is required for notification");
        }
        
        // Create a new notification with validated entities
        Notification newNotification = new Notification();
        newNotification.setEmergencyUnit(emergencyUnit);
        newNotification.setIncident(incident);
        newNotification.setUser(user);
        newNotification.setNotificationTime(LocalDate.now());
        
        // Set message
        String message = notification.getMessage();
        if (message == null || message.isEmpty()) {
            message = "Emergency notification";
        }
        newNotification.setMessage(message);
        
        // Save the notification (all foreign keys are guaranteed to be valid)
        Notification savedNotification = notificationRepository.save(newNotification);
        
        // Send WebSocket notification
        messagingTemplate.convertAndSend("/topic/notify", savedNotification);
        
        return savedNotification;
    }
}
