package com.emergency.dispatch.controller.IOcontroller;

import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.service.IOservice.DoneAssignmentService;
import com.emergency.dispatch.service.EmergencyUnitMonitorService;
import com.emergency.dispatch.repository.AssignmentRepository;
import com.emergency.dispatch.repository.EmergencyUnitRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/io/assignments")
public class DoneAssignmentController {
    @Autowired
    private DoneAssignmentService doneAssignmentService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private EmergencyUnitRepository emergencyUnitRepository;

    @Autowired
    private EmergencyUnitMonitorService emergencyUnitMonitorService;

    @Autowired
    private com.emergency.dispatch.repository.IncidentRepository incidentRepository;

    @PostMapping("/complete/{incidentId}")
    public ResponseEntity<?> completeAssignment(@PathVariable Long incidentId) {
        try {
            doneAssignmentService.completeAssignmentByIncidentId(incidentId);
            String message = "Assignment(s) for incident " + incidentId + " completed.";
            // Broadcast updated assignments list
            messagingTemplate.convertAndSend("/topic/assignment-complete", message);
            messagingTemplate.convertAndSend("/topic/assignments/all", assignmentRepository.findAll());
            // Broadcast updated completed incidents list
            messagingTemplate.convertAndSend("/topic/completed-incidents", doneAssignmentService.getCompletedIncidents());
            // Broadcast updated emergency units list
            messagingTemplate.convertAndSend("/topic/emergency-units", emergencyUnitRepository.findAll());
            // Broadcast units-monitor for real-time status
            emergencyUnitMonitorService.broadcastAllUnitsStatus();
            // Broadcast updated incident list for real-time
            messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            String errorMsg = "Error completing assignment for incident " + incidentId + ": " + e.getMessage();
            e.printStackTrace();
            return ResponseEntity.status(500).body(errorMsg);
        }
    }

    @GetMapping("/completed")
    public List<Incident> getCompletedIncidents() {
        List<Incident> completedIncidents = doneAssignmentService.getCompletedIncidents();
        messagingTemplate.convertAndSend("/topic/completed-incidents", completedIncidents);
        return completedIncidents;
    }
}
