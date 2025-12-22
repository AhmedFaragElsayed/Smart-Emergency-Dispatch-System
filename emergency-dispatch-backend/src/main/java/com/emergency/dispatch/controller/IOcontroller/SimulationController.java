package com.emergency.dispatch.controller.IOcontroller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.emergency.dispatch.service.IOservice.SimulationService;

@RestController
@RequestMapping("/api/simulation")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class SimulationController {
    @Autowired
    private SimulationService simulationService;

    @PostMapping("/start")
    public String startSimulation() {
        simulationService.startSimulation();
        return "Simulation started.";
    }

    @PostMapping("/stop")
    public String stopSimulation() {
        simulationService.stopSimulation();
        return "Simulation stopped.";
    }
}
