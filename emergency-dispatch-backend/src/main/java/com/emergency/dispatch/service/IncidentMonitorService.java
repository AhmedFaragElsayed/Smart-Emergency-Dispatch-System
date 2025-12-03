package com.emergency.dispatch.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.repository.AssignmentRepository;
import com.emergency.dispatch.repository.IncidentRepository;



@Service
public class IncidentMonitorService {

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public List<Map<String, Object>> getAllIncidentsWithStatus() {
        List<Incident> incidents = incidentRepository.findAll();
        List<Map<String, Object>> incidentsData = new ArrayList<>();

        for (Incident incident : incidents) {
            Map<String, Object> incidentData = buildIncidentData(incident);
            incidentsData.add(incidentData);
        }

        return incidentsData;
    }

    private Map<String, Object> buildIncidentData(Incident incident) {
        Map<String, Object> incidentData = new HashMap<>();
        incidentData.put("incidentId", incident.getIncidentId());
        incidentData.put("type", incident.getType());
        incidentData.put("latitude", incident.getLatitude());
        incidentData.put("longtitude", incident.getLongtitude());
        incidentData.put("needs", incident.getNeeds());
        incidentData.put("severityLevel", incident.getSeverityLevel());
        incidentData.put("reportedTime", incident.getReportedTime());

        // Get ALL assignments for this incident first
        List<Assignment> allAssignments = assignmentRepository.findByIncident_IncidentId(incident.getIncidentId());
        
        // Filter to get only active assignments
        List<Assignment> activeAssignments = allAssignments.stream()
                .filter(assignment -> assignment.getIsActive() != null && assignment.getIsActive())
                .toList();

        // Check if incident has any assignments (regardless of active status) to mark as "assigned"
        boolean hasAnyAssignments = !allAssignments.isEmpty();
        boolean hasActiveAssignments = !activeAssignments.isEmpty();

        if (hasActiveAssignments) {
            List<Map<String, Object>> assignmentsInfo = new ArrayList<>();
            for (Assignment assignment : activeAssignments) {
                Map<String, Object> assignmentInfo = new HashMap<>();
                assignmentInfo.put("assignmentId", assignment.getAssignmentId());
                assignmentInfo.put("assignmentTime", assignment.getAssignmentTime());
                assignmentInfo.put("isActive", assignment.getIsActive());
                assignmentInfo.put("unitId", assignment.getEmergencyUnit().getUnitID());
                assignmentInfo.put("unitType", assignment.getEmergencyUnit().getType());
                assignmentInfo.put("userId", assignment.getUser().getUserID());
                assignmentInfo.put("userName", assignment.getUser().getUserName());
                assignmentsInfo.add(assignmentInfo);
            }
            incidentData.put("activeAssignments", assignmentsInfo);
            incidentData.put("hasActiveAssignments", true);
            incidentData.put("assignedUnitsCount", activeAssignments.size());
        } else {
            incidentData.put("activeAssignments", null);
            incidentData.put("hasActiveAssignments", false);
            incidentData.put("assignedUnitsCount", 0);
        }
        
        // Mark incident as "assigned" if it has ANY assignment (active or not)
        incidentData.put("hasAssignments", hasAnyAssignments);
        incidentData.put("totalAssignmentsCount", allAssignments.size());

        return incidentData;
    }

    public void broadcastAllIncidents() {
        List<Map<String, Object>> incidentsData = getAllIncidentsWithStatus();
        messagingTemplate.convertAndSend("/topic/incidents-monitor", (Object) incidentsData);
    }

    public void broadcastIncidentUpdate(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId).orElse(null);
        if (incident != null) {
            Map<String, Object> incidentData = buildIncidentData(incident);
            messagingTemplate.convertAndSend("/topic/incidents-monitor/update", (Object) incidentData);
        }
    }

    public void broadcastIncidentDeletion(Long incidentId) {
        Map<String, Object> deletionData = new HashMap<>();
        deletionData.put("incidentId", incidentId);
        deletionData.put("action", "deleted");
        messagingTemplate.convertAndSend("/topic/incidents-monitor/update", (Object) deletionData);
    }
}
