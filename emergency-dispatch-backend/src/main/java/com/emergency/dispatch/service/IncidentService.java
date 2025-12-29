package com.emergency.dispatch.service;


import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.enums.IncidentType;
import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.model.Notification;
import com.emergency.dispatch.model.User;
import com.emergency.dispatch.repository.AssignmentRepository;
import com.emergency.dispatch.repository.IncidentRepository;
import com.emergency.dispatch.repository.NotificationRepository;
import com.emergency.dispatch.repository.UserRepository;

@Service
public class IncidentService {

     @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private com.emergency.dispatch.service.IOservice.IncidentMonService monitorService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentService assignmentService;

    public Incident createIncident(Incident incident) {
        if (incident.getType() == null) throw new IllegalArgumentException("Incident type is required");
        if (incident.getStatus() == null) incident.setStatus(IncidentStatus.PENDING);
        Incident savedIncident = incidentRepository.save(incident);
        monitorService.broadcastIncidentUpdate(savedIncident.getIncidentId());
        // Broadcast all incidents for real-time list update
        messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
        notifyAdminsAboutNewIncident(savedIncident);
        return savedIncident;
    }

    private void notifyAdminsAboutNewIncident(Incident incident) {
        try {
            List<User> admins = userRepository.findAll().stream()
                    .filter(user -> "Admin".equalsIgnoreCase(user.getRole()))
                    .toList();
            for (User admin : admins) {
                Notification notification = Notification.builder()
                        .user(admin)
                        .incident(incident)
                        .message("New " + incident.getType() + " incident #" + incident.getIncidentId() + " has been created")
                        .notificationTime(LocalDate.now())
                        .build();
                Notification savedNotification = notificationRepository.save(notification);
                messagingTemplate.convertAndSend("/topic/notifications", savedNotification);
            }
        } catch (Exception e) {
            System.err.println("Error notifying admins: " + e.getMessage());
        }
    }
        

    public Optional<Incident> getIncidentById(Long incidentId) {
        return incidentRepository.findById(incidentId);
    }

    public List<Incident> getAllIncidents() {
        return incidentRepository.findAll();
    }

    public Incident updateIncident(Long incidentId, Incident incidentDetails) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found with id: " + incidentId));
        IncidentType newType = incidentDetails.getType();
        if (newType != null) incident.setType(newType);
        if (incidentDetails.getLatitude() != null) incident.setLatitude(incidentDetails.getLatitude());
        if (incidentDetails.getLongtitude() != null) incident.setLongtitude(incidentDetails.getLongtitude());
        if (incidentDetails.getNeeds() != null) incident.setNeeds(incidentDetails.getNeeds());
        if (incidentDetails.getSeverityLevel() != null) incident.setSeverityLevel(incidentDetails.getSeverityLevel());
        if (incidentDetails.getReportedTime() != null) incident.setReportedTime(incidentDetails.getReportedTime());
        IncidentStatus newStatus = incidentDetails.getStatus();
        if (newStatus != null) incident.setStatus(newStatus);
        Incident updatedIncident = incidentRepository.save(incident);
        // If status changed to COMPLETED, deactivate all active assignments for this incident
        if (newStatus == IncidentStatus.COMPLETED) {
            List<Assignment> activeAssignments = assignmentRepository
                    .findByIncident_IncidentIdAndIsActiveTrue(incidentId);
            for (Assignment assignment : activeAssignments) {
                try {
                    assignmentService.deactivateAssignment(assignment.getAssignmentId());
                } catch (Exception e) {
                    System.err.println("Error deactivating assignment " + assignment.getAssignmentId() + ": " + e.getMessage());
                }
            }
        }
        monitorService.broadcastIncidentUpdate(updatedIncident.getIncidentId());
        // Broadcast all incidents for real-time list update
        messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
        return updatedIncident;
    }

    public void deleteIncident(Long incidentId) {
        if (incidentRepository.existsById(incidentId)) {
            incidentRepository.deleteById(incidentId);
            // Broadcast the deletion to all monitoring clients
            monitorService.broadcastIncidentDeletion(incidentId);
            // Broadcast all incidents for real-time list update
            messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
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

    public List<Incident> getLiveIncidents() {
        return incidentRepository.findByStatusIn(List.of(IncidentStatus.PENDING, IncidentStatus.DISPATCH));
    }
}
