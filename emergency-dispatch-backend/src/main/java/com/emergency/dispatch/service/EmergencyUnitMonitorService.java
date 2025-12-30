package com.emergency.dispatch.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.repository.AssignmentRepository;
import com.emergency.dispatch.repository.EmergencyUnitRepository;



@Service
public class EmergencyUnitMonitorService {

    @Autowired
    private EmergencyUnitRepository emergencyUnitRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Get all emergency units with their current assignment status
     */
    public List<Map<String, Object>> getAllUnitsWithStatus() {
        List<EmergencyUnit> units = emergencyUnitRepository.findAll();
        List<Map<String, Object>> unitsData = new ArrayList<>();

        for (EmergencyUnit unit : units) {
            Map<String, Object> unitData = new HashMap<>();
            unitData.put("unitID", unit.getUnitID());
            unitData.put("type", unit.getType());
            unitData.put("latitude", unit.getLatitude());
            unitData.put("longtitude", unit.getLongtitude());
            unitData.put("capacity", unit.getCapacity());
            unitData.put("status", unit.getStatus());

            // Get active assignment if exists
            List<Assignment> activeAssignments = assignmentRepository.findByEmergencyUnitAndIsActiveTrue(unit);
            if (!activeAssignments.isEmpty()) {
                Assignment activeAssignment = activeAssignments.get(0);
                Map<String, Object> assignmentInfo = new HashMap<>();
                assignmentInfo.put("assignmentId", activeAssignment.getAssignmentId());
                assignmentInfo.put("assignmentTime", activeAssignment.getAssignmentTime());
                assignmentInfo.put("userId", activeAssignment.getUser() != null ? activeAssignment.getUser().getUserID() : null);
                assignmentInfo.put("userName", activeAssignment.getUser() != null ? activeAssignment.getUser().getUserName() : null);
                assignmentInfo.put("incidentId", activeAssignment.getIncident().getIncidentId());
                assignmentInfo.put("incidentType", activeAssignment.getIncident().getType());
                assignmentInfo.put("incidentSeverity", activeAssignment.getIncident().getSeverityLevel());
                
                unitData.put("activeAssignment", assignmentInfo);
                unitData.put("hasActiveAssignment", true);
            } else {
                unitData.put("activeAssignment", null);
                unitData.put("hasActiveAssignment", false);
            }

            unitsData.add(unitData);
        }

        return unitsData;
    }

    
    public void broadcastAllUnitsStatus() {
        List<Map<String, Object>> unitsData = getAllUnitsWithStatus();
        messagingTemplate.convertAndSend("/topic/units-monitor", (Object) unitsData);
    }

    
    public void broadcastUnitStatusUpdate(Long unitId) {
        EmergencyUnit unit = emergencyUnitRepository.findById(unitId).orElse(null);
        if (unit != null) {
            Map<String, Object> unitData = new HashMap<>();
            unitData.put("unitID", unit.getUnitID());
            unitData.put("type", unit.getType());
            unitData.put("latitude", unit.getLatitude());
            unitData.put("longtitude", unit.getLongtitude());
            unitData.put("capacity", unit.getCapacity());
            unitData.put("status", unit.getStatus());

            // Get active assignment if exists
            List<Assignment> activeAssignments = assignmentRepository.findByEmergencyUnitAndIsActiveTrue(unit);
            if (!activeAssignments.isEmpty()) {
                Assignment activeAssignment = activeAssignments.get(0);
                Map<String, Object> assignmentInfo = new HashMap<>();
                assignmentInfo.put("assignmentId", activeAssignment.getAssignmentId());
                assignmentInfo.put("assignmentTime", activeAssignment.getAssignmentTime());
                assignmentInfo.put("userId", activeAssignment.getUser() != null ? activeAssignment.getUser().getUserID() : null);
                assignmentInfo.put("userName", activeAssignment.getUser() != null ? activeAssignment.getUser().getUserName() : null);
                assignmentInfo.put("incidentId", activeAssignment.getIncident().getIncidentId());
                assignmentInfo.put("incidentType", activeAssignment.getIncident().getType());
                assignmentInfo.put("incidentSeverity", activeAssignment.getIncident().getSeverityLevel());
                
                unitData.put("activeAssignment", assignmentInfo);
                unitData.put("hasActiveAssignment", true);
            } else {
                unitData.put("activeAssignment", null);
                unitData.put("hasActiveAssignment", false);
            }

            messagingTemplate.convertAndSend("/topic/units-monitor/update", (Object) unitData);
        }
    }
}
