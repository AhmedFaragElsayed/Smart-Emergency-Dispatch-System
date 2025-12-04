package com.emergency.dispatch.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.service.EmergencyUnitService;

@RestController
@RequestMapping("/api/emergency-units")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class EmergencyUnitController {

    @Autowired
    private EmergencyUnitService emergencyUnitService;

    @PostMapping
    public ResponseEntity<EmergencyUnit> createEmergencyUnit(@RequestBody EmergencyUnit emergencyUnit) {
        try {
            EmergencyUnit createdUnit = emergencyUnitService.createEmergencyUnit(emergencyUnit);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdUnit);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmergencyUnit> getEmergencyUnitById(@PathVariable("id") Long id) {
        return emergencyUnitService.getEmergencyUnitById(id)
                .map(unit -> ResponseEntity.ok(unit))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<EmergencyUnit>> getAllEmergencyUnits(@RequestParam(value = "type", required = false) String type) {
        try {
            List<EmergencyUnit> units;
            if (type != null && !type.isEmpty()) {
                units = emergencyUnitService.getEmergencyUnitsByType(type);
            } else {
                units = emergencyUnitService.getAllEmergencyUnits();
            }
            return ResponseEntity.ok(units);
        } catch (Exception e) {
            System.err.println("Error getting emergency units: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/available")
    public ResponseEntity<List<EmergencyUnit>> getAvailableUnits() {
        try {
            List<EmergencyUnit> availableUnits = emergencyUnitService.getAvailableUnits();
            return ResponseEntity.ok(availableUnits);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmergencyUnit> updateEmergencyUnit(@PathVariable("id") Long id, @RequestBody EmergencyUnit unitDetails) {
        try {
            EmergencyUnit updatedUnit = emergencyUnitService.updateEmergencyUnit(id, unitDetails);
            return ResponseEntity.ok(updatedUnit);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmergencyUnit(@PathVariable("id") Long id) {
        try {
            emergencyUnitService.deleteEmergencyUnit(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
