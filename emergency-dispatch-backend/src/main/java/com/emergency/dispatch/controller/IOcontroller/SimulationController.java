package com.emergency.dispatch.controller.IOcontroller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.emergency.dispatch.service.IOservice.SimulationService;
import com.emergency.dispatch.service.IOservice.IncidentMonService;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@RestController
@RequestMapping("/api/simulation")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class SimulationController {
    @Autowired
    private SimulationService simulationService;
    
    @Autowired
    private IncidentMonService incidentMonitorService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping("/start")
    public String startSimulation() {
        simulationService.startSimulation();
        incidentMonitorService.enableMonitoring();
        return "Simulation started.";
    }

    @PostMapping("/stop")
    public String stopSimulation() {
        simulationService.stopSimulation();
        incidentMonitorService.disableMonitoring();
        return "Simulation stopped.";
    }
}
