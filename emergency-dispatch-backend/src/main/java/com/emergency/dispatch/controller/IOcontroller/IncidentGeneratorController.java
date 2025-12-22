package com.emergency.dispatch.controller.IOcontroller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.emergency.dispatch.service.IOservice.IncidentGeneratorService;

@RestController
@RequestMapping("/api/incidents/generate")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class IncidentGeneratorController {
    @Autowired
    private IncidentGeneratorService incidentGeneratorService;

    @PostMapping
    public ResponseEntity<String> generateIncidents(@RequestParam int count) {
        incidentGeneratorService.generateRandomIncidents(count);
        return ResponseEntity.ok(count + " random incidents generated and broadcasted.");
    }
}
