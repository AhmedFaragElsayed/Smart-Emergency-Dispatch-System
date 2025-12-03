package com.emergency.dispatch.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.repository.IncidentRepository;

@Service
public class IncidentService {

     @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private IncidentMonitorService monitorService;

    public Incident createIncident(Incident incident) {
        try {
            Incident savedIncident = incidentRepository.save(incident);
            // Broadcast the update to all monitoring clients
            monitorService.broadcastIncidentUpdate(savedIncident.getIncidentId());
            return savedIncident;
        } catch (Exception e) {
            System.out.println("Error creating incident: " + e.getMessage());
            throw new RuntimeException("Failed to create incident: " + e.getMessage());
        }
    }

    public Optional<Incident> getIncidentById(Long incidentId) {
        return incidentRepository.findById(incidentId);
    }

    public List<Incident> getAllIncidents() {
        return incidentRepository.findAll();
    }

    public Incident updateIncident(Long incidentId, Incident incidentDetails) {
        Incident updatedIncident = incidentRepository.findById(incidentId)
                .map(incident -> {
                    incident.setType(incidentDetails.getType());
                    incident.setLatitude(incidentDetails.getLatitude());
                    incident.setLongtitude(incidentDetails.getLongtitude());
                    incident.setNeeds(incidentDetails.getNeeds());
                    incident.setSeverityLevel(incidentDetails.getSeverityLevel());
                    incident.setReportedTime(incidentDetails.getReportedTime());
                    return incidentRepository.save(incident);
                })
                .orElseThrow(() -> new RuntimeException("Incident not found with id: " + incidentId));
        
        // Broadcast the update to all monitoring clients
        monitorService.broadcastIncidentUpdate(incidentId);
        return updatedIncident;
    }

    public void deleteIncident(Long incidentId) {
        if (incidentRepository.existsById(incidentId)) {
            incidentRepository.deleteById(incidentId);
            // Broadcast the deletion to all monitoring clients
            monitorService.broadcastIncidentDeletion(incidentId);
        } else {
            throw new RuntimeException("Incident not found with id: " + incidentId);
        }
    }

    public boolean incidentExists(Long incidentId) {
        return incidentRepository.existsById(incidentId);
    }

    public List<Incident> getIncidentsBySeverity(String severityLevel) {
        return incidentRepository.findAll().stream()
                .filter(incident -> severityLevel.equals(incident.getSeverityLevel()))
                .toList();
    }
}
