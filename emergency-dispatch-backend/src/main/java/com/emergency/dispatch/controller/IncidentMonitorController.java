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

import com.emergency.dispatch.service.IncidentMonitorService;



@RestController
@RequestMapping("/api/monitor")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class IncidentMonitorController {

    @Autowired
    private IncidentMonitorService monitorService;

    
    @GetMapping("/incidents")
    public ResponseEntity<List<Map<String, Object>>> getAllIncidentsStatus() {
        try {
            List<Map<String, Object>> incidentsData = monitorService.getAllIncidentsWithStatus();
            return ResponseEntity.ok(incidentsData);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

@Controller
class IncidentMonitorWebSocketController {

    @Autowired
    private IncidentMonitorService monitorService;

    @MessageMapping("/monitor.requestAllIncidents")
    public void requestAllIncidentsStatus() {
        monitorService.broadcastAllIncidents();
    }
}
