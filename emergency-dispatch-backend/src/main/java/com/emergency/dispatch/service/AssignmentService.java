package com.emergency.dispatch.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

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

    
    @Transactional
    public Assignment createAssignment(Long userId, Long incidentId, Long unitId) {
        // Validate user exists
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User with ID " + userId + " not found"));

        // Validate incident exists
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new RuntimeException("Incident with ID " + incidentId + " not found"));

        // Validate emergency unit exists
        EmergencyUnit emergencyUnit = emergencyUnitRepository.findById(unitId)
                .orElseThrow(() -> new RuntimeException("Emergency Unit with ID " + unitId + " not found"));

        // Check if emergency unit already has an active assignment
        List<Assignment> activeAssignments = assignmentRepository.findByEmergencyUnitAndIsActiveTrue(emergencyUnit);
        if (!activeAssignments.isEmpty()) {
            throw new RuntimeException("Emergency Unit with ID " + unitId + 
                " already has an active assignment (Assignment ID: " + activeAssignments.get(0).getAssignmentId() + 
                "). Please deactivate it first or choose another unit.");
        }

        // Create new assignment
        Assignment assignment = new Assignment();
        assignment.setUser(user);
        assignment.setIncident(incident);
        assignment.setEmergencyUnit(emergencyUnit);
        assignment.setAssignmentTime(LocalDate.now());
        assignment.setIsActive(true);
        assignment.setResolutionTime(null); // Not resolved yet

        // Set emergency unit status to unavailable (true = active/unavailable)
        emergencyUnit.setStatus(true);
        emergencyUnitRepository.save(emergencyUnit);

        // Save assignment
        Assignment savedAssignment = assignmentRepository.save(assignment);
        
        // Update incident status to "dispatched" when first unit is assigned
        if (incident.getStatus() == null || !incident.getStatus().equals("dispatched")) {
            incident.setStatus("dispatched");
            incidentRepository.save(incident);
            
            // Broadcast incident update via incident monitor service
            incidentMonitorService.broadcastIncidentUpdate(incidentId);
        }
        
        // Broadcast WebSocket notification about the new active assignment
        messagingTemplate.convertAndSend("/topic/assignments", (Object) savedAssignment);
        
        // Broadcast updated emergency unit status to monitoring system
        monitorService.broadcastUnitStatusUpdate(unitId);
        
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
