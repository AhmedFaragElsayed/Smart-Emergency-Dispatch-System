package com.emergency.dispatch.controller;

import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.service.EmergencyUnitGeneratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/emergency-units/generator")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class EmergencyUnitGeneratorController {
    @Autowired
    private EmergencyUnitGeneratorService emergencyUnitGeneratorService;

    @PostMapping("/generate-random")
    public ResponseEntity<List<EmergencyUnit>> generateRandomUnits(@RequestParam("count") int count) {
        try {
            List<EmergencyUnit> units = emergencyUnitGeneratorService.generateRandomEmergencyUnits(count);
            return ResponseEntity.ok(units);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
