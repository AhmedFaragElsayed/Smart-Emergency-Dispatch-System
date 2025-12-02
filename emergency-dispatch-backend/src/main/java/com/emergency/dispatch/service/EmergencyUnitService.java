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

    public EmergencyUnit createEmergencyUnit(EmergencyUnit emergencyUnit) {
        try {
            return emergencyUnitRepository.save(emergencyUnit);
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
                    return emergencyUnitRepository.save(unit);
                })
                .orElseThrow(() -> new RuntimeException("Emergency unit not found with id: " + unitID));
    }

    public EmergencyUnit updateLocation(Long unitID, Double latitude, Double longitude) {
        return emergencyUnitRepository.findById(unitID)
                .map(unit -> {
                    unit.setLatitude(latitude);
                    unit.setLongtitude(longitude);
                    return emergencyUnitRepository.save(unit);
                })
                .orElseThrow(() -> new RuntimeException("Emergency unit not found with id: " + unitID));
    }

    public void deleteEmergencyUnit(Long unitID) {
        if (emergencyUnitRepository.existsById(unitID)) {
            emergencyUnitRepository.deleteById(unitID);
        } else {
            throw new RuntimeException("Emergency unit not found with id: " + unitID);
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
