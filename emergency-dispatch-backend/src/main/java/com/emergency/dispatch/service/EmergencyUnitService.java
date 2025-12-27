package com.emergency.dispatch.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.repository.EmergencyUnitRepository;
import com.emergency.dispatch.repository.AssignmentRepository;
import com.emergency.dispatch.repository.IncidentRepository;
import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.enums.EmergencyUnitType;

@Service
public class EmergencyUnitService {

     @Autowired
    private EmergencyUnitRepository emergencyUnitRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private EmergencyUnitMonitorService monitorService;

    @Autowired
    private IncidentMonitorService incidentMonitorService;

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

    public List<EmergencyUnit> getEmergencyUnitsByType(EmergencyUnitType type) {
        List<EmergencyUnit> allUnits = emergencyUnitRepository.findAll();
        return allUnits.stream()
                .filter(unit -> unit.getType() == type)
                .toList();
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
                    monitorService.broadcastUnitStatusUpdate(savedUnit.getUnitID());
                    return savedUnit;
                })
                .orElseThrow(() -> new IllegalArgumentException("Emergency unit not found with id: " + unitID));
    }

    public EmergencyUnit updateLocation(Long unitID, Double latitude, Double longitude) {
        return emergencyUnitRepository.findById(unitID)
                .map(unit -> {
                    unit.setLatitude(latitude);
                    unit.setLongtitude(longitude);
                    EmergencyUnit savedUnit = emergencyUnitRepository.save(unit);
                    monitorService.broadcastUnitStatusUpdate(savedUnit.getUnitID());
                    return savedUnit;
                })
                .orElseThrow(() -> new IllegalArgumentException("Emergency unit not found with id: " + unitID));
    }

    @Transactional
    public void deleteEmergencyUnit(Long unitID) {
        // First, collect all data we need before making changes (to avoid deadlocks)
        EmergencyUnit unit = emergencyUnitRepository.findById(unitID)
                .orElseThrow(() -> new IllegalArgumentException("Emergency unit not found with id: " + unitID));
        List<Assignment> unitAssignments = assignmentRepository.findByEmergencyUnit_UnitID(unitID);
        Set<Long> affectedIncidentIds = new HashSet<>();
        Set<Long> affectedUnitIds = new HashSet<>();
        for (Assignment assignment : unitAssignments) {
            if (assignment.getIncident() != null) {
                affectedIncidentIds.add(assignment.getIncident().getIncidentId());
            }
        }
        for (Long incidentId : affectedIncidentIds) {
            List<Assignment> incidentAssignments = assignmentRepository.findByIncident_IncidentId(incidentId);
            for (Assignment assignment : incidentAssignments) {
                if (assignment.getEmergencyUnit() != null) {
                    affectedUnitIds.add(assignment.getEmergencyUnit().getUnitID());
                }
            }
        }
        List<Long> sortedUnitIds = new java.util.ArrayList<>(affectedUnitIds);
        java.util.Collections.sort(sortedUnitIds);
        for (Long affectedUnitId : sortedUnitIds) {
            Optional<EmergencyUnit> unitOpt = emergencyUnitRepository.findById(affectedUnitId);
            unitOpt.ifPresent(affectedUnit -> {
                affectedUnit.setStatus(false); // false = available
                emergencyUnitRepository.save(affectedUnit);
            });
        }
        for (Long incidentId : affectedIncidentIds) {
            List<Assignment> incidentAssignments = assignmentRepository.findByIncident_IncidentId(incidentId);
            assignmentRepository.deleteAll(incidentAssignments);
        }
        List<Long> sortedIncidentIds = new java.util.ArrayList<>(affectedIncidentIds);
        java.util.Collections.sort(sortedIncidentIds);
        for (Long incidentId : sortedIncidentIds) {
            Optional<Incident> incidentOpt = incidentRepository.findById(incidentId);
            incidentOpt.ifPresent(incident -> {
                incident.setStatus(IncidentStatus.PENDING);
                incidentRepository.save(incident);
            });
        }
        if (unit.getAssignments() != null) {
            unit.getAssignments().clear();
        }
        if (unit.getNotifications() != null) {
            unit.getNotifications().clear();
        }
        emergencyUnitRepository.delete(unit);
        emergencyUnitRepository.flush();
        for (Long affectedUnitId : sortedUnitIds) {
            try {
                monitorService.broadcastUnitStatusUpdate(affectedUnitId);
            } catch (Exception e) {
                System.err.println("Error broadcasting unit update for unit " + affectedUnitId);
            }
        }
        for (Long incidentId : sortedIncidentIds) {
            try {
                incidentMonitorService.broadcastIncidentUpdate(incidentId);
            } catch (Exception e) {
                System.err.println("Error broadcasting incident update for incident " + incidentId);
            }
        }
        System.out.println("Successfully deleted emergency unit " + unitID +
                         " and reset " + affectedIncidentIds.size() + " incident(s) to PENDING status, " +
                         "freed " + affectedUnitIds.size() + " unit(s)");
    }

    public boolean emergencyUnitExists(Long unitID) {
        return emergencyUnitRepository.existsById(unitID);
    }

    public List<EmergencyUnit> getAvailableUnits() {
        return emergencyUnitRepository.findAll().stream()
                .filter(unit -> Boolean.TRUE.equals(unit.getStatus()))
                .toList();
    }

    public List<EmergencyUnit> getAllUnits() {
        return emergencyUnitRepository.findAll();
    }
}
