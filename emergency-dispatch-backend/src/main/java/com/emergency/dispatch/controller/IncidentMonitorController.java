package com.emergency.dispatch.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.emergency.dispatch.service.IOservice.IncidentMonService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;



@RestController
@RequestMapping("/api/monitor")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class IncidentMonitorController {

    @Autowired
    private IncidentMonService monitorService;

    @Autowired
    private com.emergency.dispatch.service.IncidentMonitorService incidentMonitorService;

    @GetMapping("/incidents")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getAllIncidentsStatus() {
        try {
            // Return all incidents with enriched data (assignment status, counts, etc.)
            java.util.List<java.util.Map<String, Object>> incidentsData = incidentMonitorService.getAllIncidentsWithStatus();
            return ResponseEntity.ok(incidentsData);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}

@Controller
class IncidentMonitorWebSocketController {

    @Autowired
    private IncidentMonService monitorService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Transactional
    @MessageMapping("/incidents.overdue")
    public void sendOverdueIncidents() {
        java.util.List<com.emergency.dispatch.model.Incident> overdue = monitorService.getOverdueIncidents();
        messagingTemplate.convertAndSend("/topic/incidents/overdue", overdue);
    }
}
