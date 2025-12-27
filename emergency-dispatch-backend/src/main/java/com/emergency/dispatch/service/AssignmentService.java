package com.emergency.dispatch.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;


import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.model.User;
import com.emergency.dispatch.repository.AssignmentRepository;
import com.emergency.dispatch.repository.EmergencyUnitRepository;
import com.emergency.dispatch.repository.IncidentRepository;
import com.emergency.dispatch.repository.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class AssignmentService {

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmergencyUnitRepository emergencyUnitRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private EmergencyUnitMonitorService monitorService;

    @Autowired
    private IncidentMonitorService incidentMonitorService;

    /**
     * Public method with retry logic for handling deadlocks
     */
    public Assignment createAssignment(Long userId, Long incidentId, Long unitId) {
        int maxRetries = 3;
        int retryCount = 0;
        long waitTime = 100; // Start with 100ms
        
        while (retryCount < maxRetries) {
            try {
                return createAssignmentInternal(userId, incidentId, unitId);
            } catch (Exception e) {
                // Check if it's a deadlock exception
                String errorMessage = e.getMessage().toLowerCase();
                if (errorMessage.contains("deadlock") && retryCount < maxRetries - 1) {
                    retryCount++;
                    System.out.println("Deadlock detected, retrying... Attempt " + retryCount + " of " + maxRetries);
                    try {
                        // Exponential backoff
                        Thread.sleep(waitTime);
                        waitTime *= 2; // Double the wait time for next retry
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Retry interrupted", ie);
                    }
                } else {
                    // Not a deadlock or max retries reached
                    throw e;
                }
            }
        }
        throw new RuntimeException("Failed to create assignment after " + maxRetries + " attempts due to deadlocks");
    }
    
    @Transactional
    private Assignment createAssignmentInternal(Long userId, Long incidentId, Long unitId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("Incident with ID " + incidentId + " not found"));
        EmergencyUnit emergencyUnit = emergencyUnitRepository.findById(unitId)
                .orElseThrow(() -> new IllegalArgumentException("Emergency Unit with ID " + unitId + " not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User with ID " + userId + " not found"));
        List<Assignment> activeAssignments = assignmentRepository.findByEmergencyUnitAndIsActiveTrue(emergencyUnit);
        if (!activeAssignments.isEmpty()) {
            throw new IllegalStateException("Emergency Unit with ID " + unitId +
                " already has an active assignment (Assignment ID: " + activeAssignments.get(0).getAssignmentId() +
                "). Please deactivate it first or choose another unit.");
        }
        if (incident.getStatus() == null || incident.getStatus() == IncidentStatus.PENDING) {
            incident.setStatus(IncidentStatus.DISPATCH);
            incident = incidentRepository.save(incident);
        }
        emergencyUnit.setStatus(true);
        emergencyUnit = emergencyUnitRepository.save(emergencyUnit);
        Assignment assignment = new Assignment();
        assignment.setUser(user);
        assignment.setIncident(incident);
        assignment.setEmergencyUnit(emergencyUnit);
        assignment.setAssignmentTime(LocalDate.now());
        assignment.setIsActive(true);
        assignment.setResolutionTime(null);
        Assignment savedAssignment = assignmentRepository.save(assignment);
        try {
            incidentMonitorService.broadcastIncidentUpdate(incidentId);
            messagingTemplate.convertAndSend("/topic/assignments", (Object) savedAssignment);
            monitorService.broadcastUnitStatusUpdate(unitId);
            // Broadcast updated incident list for real-time
            messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
        } catch (Exception e) {
            System.err.println("Error broadcasting assignment updates: " + e.getMessage());
        }
        return savedAssignment;
    }

    @Transactional
    public Assignment deactivateAssignment(Long assignmentId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment with ID " + assignmentId + " not found"));

        if (!assignment.getIsActive()) {
            throw new RuntimeException("Assignment is already inactive");
        }

        // Set resolution time to now
        LocalDate now = LocalDate.now();
        assignment.setResolutionTime(now);
        assignment.setIsActive(false);

        // Set emergency unit status to inactive
        EmergencyUnit emergencyUnit = assignment.getEmergencyUnit();
        emergencyUnit.setStatus(false);
        emergencyUnitRepository.save(emergencyUnit);

        Assignment savedAssignment = assignmentRepository.save(assignment);
        
        // Broadcast WebSocket notification about the deactivated assignment
        messagingTemplate.convertAndSend("/topic/assignments", (Object) savedAssignment);
        
        // Broadcast updated emergency unit status to monitoring system
        monitorService.broadcastUnitStatusUpdate(emergencyUnit.getUnitID());
        // Broadcast updated incident list for real-time (includes completed incidents)
        messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
        
        return savedAssignment;
    }

    public Long getResolutionTimeInDays(Long assignmentId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment with ID " + assignmentId + " not found"));

        if (assignment.getIsActive()) {
            // If still active, calculate days since assignment
            LocalDate assignmentTime = assignment.getAssignmentTime();
            return ChronoUnit.DAYS.between(assignmentTime, LocalDate.now());
        } else {
            // If completed, calculate days between assignment and resolution
            LocalDate assignmentTime = assignment.getAssignmentTime();
            LocalDate resolutionTime = assignment.getResolutionTime();
            if (resolutionTime != null) {
                return ChronoUnit.DAYS.between(assignmentTime, resolutionTime);
            }
            return null;
        }
    }

    
    public Optional<Assignment> getAssignmentById(Long assignmentId) {
        return assignmentRepository.findById(assignmentId);
    }

    
    public List<Assignment> getAllAssignments() {
        return assignmentRepository.findAll();
    }

    
    public List<Assignment> getActiveAssignments() {
        return assignmentRepository.findByIsActiveTrue();
    }

    
    public List<Assignment> getAssignmentsByUserId(Long userId) {
        return assignmentRepository.findByUser_UserID(userId);
    }

   
    public List<Assignment> getAssignmentsByUnitId(Long unitId) {
        return assignmentRepository.findByEmergencyUnit_UnitID(unitId);
    }

   
    public List<Assignment> getActiveAssignmentsByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User with ID " + userId + " not found"));
        return assignmentRepository.findByUserAndIsActiveTrue(user);
    }

    
    public List<Assignment> getActiveAssignmentsByUnitId(Long unitId) {
        EmergencyUnit emergencyUnit = emergencyUnitRepository.findById(unitId)
                .orElseThrow(() -> new RuntimeException("Emergency Unit with ID " + unitId + " not found"));
        return assignmentRepository.findByEmergencyUnitAndIsActiveTrue(emergencyUnit);
    }


    public void deleteAssignment(Long assignmentId) {
        if (!assignmentRepository.existsById(assignmentId)) {
            throw new RuntimeException("Assignment with ID " + assignmentId + " not found");
        }
        assignmentRepository.deleteById(assignmentId);
    }
}
