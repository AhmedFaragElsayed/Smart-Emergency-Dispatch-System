package com.emergency.dispatch.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.repository.EmergencyUnitRepository;

@Service
public class EmergencyUnitService {

     @Autowired
    private EmergencyUnitRepository emergencyUnitRepository;

    @Autowired
    private EmergencyUnitMonitorService monitorService;

    public EmergencyUnit createEmergencyUnit(EmergencyUnit emergencyUnit) {
        try {
            EmergencyUnit savedUnit = emergencyUnitRepository.save(emergencyUnit);
            // Broadcast the new unit to monitoring system
            monitorService.broadcastUnitStatusUpdate(savedUnit.getUnitID());
            return savedUnit;
        } catch (Exception e) {
            System.out.println("Error creating emergency unit: " + e.getMessage());
            throw new RuntimeException("Failed to create emergency unit: " + e.getMessage());
        }
    }

    public Optional<EmergencyUnit> getEmergencyUnitById(Long unitID) {
        return emergencyUnitRepository.findById(unitID);
    }

    public List<EmergencyUnit> getAllEmergencyUnits() {
        return emergencyUnitRepository.findAll();
    }

    public EmergencyUnit updateEmergencyUnit(Long unitID, EmergencyUnit unitDetails) {
        return emergencyUnitRepository.findById(unitID)
                .map(unit -> {
                    unit.setType(unitDetails.getType());
                    unit.setLatitude(unitDetails.getLatitude());
                    unit.setLongtitude(unitDetails.getLongtitude());
                    unit.setCapacity(unitDetails.getCapacity());
                    unit.setStatus(unitDetails.getStatus());
                    EmergencyUnit savedUnit = emergencyUnitRepository.save(unit);
                    // Broadcast all data changes to monitoring system
                    monitorService.broadcastUnitStatusUpdate(savedUnit.getUnitID());
                    return savedUnit;
                })
                .orElseThrow(() -> new RuntimeException("Emergency unit not found with id: " + unitID));
    }

    public EmergencyUnit updateLocation(Long unitID, Double latitude, Double longitude) {
        return emergencyUnitRepository.findById(unitID)
                .map(unit -> {
                    unit.setLatitude(latitude);
                    unit.setLongtitude(longitude);
                    EmergencyUnit savedUnit = emergencyUnitRepository.save(unit);
                    // Broadcast location change to monitoring system
                    monitorService.broadcastUnitStatusUpdate(savedUnit.getUnitID());
                    return savedUnit;
                })
                .orElseThrow(() -> new RuntimeException("Emergency unit not found with id: " + unitID));
    }

    public void deleteEmergencyUnit(Long unitID) {
        try {
            EmergencyUnit unit = emergencyUnitRepository.findById(unitID)
                    .orElseThrow(() -> new RuntimeException("Emergency unit not found with id: " + unitID));
            
            // Clear bidirectional relationships before deletion
            if (unit.getAssignments() != null) {
                unit.getAssignments().clear();
            }
            if (unit.getNotifications() != null) {
                unit.getNotifications().clear();
            }
            
            emergencyUnitRepository.delete(unit);
            emergencyUnitRepository.flush();
        } catch (Exception e) {
            System.err.println("Error deleting emergency unit " + unitID + ": " + e.getMessage());
            throw new RuntimeException("Failed to delete emergency unit: " + e.getMessage());
        }
    }

    public boolean emergencyUnitExists(Long unitID) {
        return emergencyUnitRepository.existsById(unitID);
    }

    public List<EmergencyUnit> getAvailableUnits() {
        return emergencyUnitRepository.findAll().stream()
                .filter(unit -> Boolean.TRUE.equals(unit.getStatus()))
                .toList();
    }
}
