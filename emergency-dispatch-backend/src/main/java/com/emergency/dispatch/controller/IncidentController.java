package com.emergency.dispatch.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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

import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.service.IncidentService;

@RestController
@RequestMapping("/api/incidents")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class IncidentController {

    @Autowired
    private IncidentService incidentService;

    @PostMapping
    public ResponseEntity<Incident> createIncident(@RequestBody Map<String, Object> incidentData) {
        try {
            System.out.println("Received incident data: " + incidentData);
            
            Incident incident = new Incident();
            incident.setType((String) incidentData.get("type"));
            incident.setLatitude(((Number) incidentData.get("latitude")).doubleValue());
            incident.setLongtitude(((Number) incidentData.get("longtitude")).doubleValue());
            
            // Handle needs - could be Integer or String
            Object needsObj = incidentData.get("needs");
            if (needsObj instanceof Number) {
                incident.setNeeds(((Number) needsObj).intValue());
            } else if (needsObj instanceof String) {
                incident.setNeeds(Integer.parseInt((String) needsObj));
            }
            
            incident.setSeverityLevel((String) incidentData.get("severityLevel"));
            
            // Set default status to PENDING
            incident.setStatus("PENDING");
            
            // Handle reportedTime - can be date or datetime
            String reportedTimeStr = (String) incidentData.get("reportedTime");
            if (reportedTimeStr != null) {
                if (reportedTimeStr.length() == 10) {
                    // Date only format: 2025-12-03
                    incident.setReportedTime(LocalDateTime.parse(reportedTimeStr + "T00:00:00"));
                } else {
                    // DateTime format: 2025-12-03T10:30:00
                    incident.setReportedTime(LocalDateTime.parse(reportedTimeStr));
                }
            }
            
            Incident createdIncident = incidentService.createIncident(incident);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdIncident);
        } catch (Exception e) {
            System.err.println("Error creating incident: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Incident> getIncidentById(@PathVariable("id") Long id) {
        return incidentService.getIncidentById(id)
                .map(incident -> ResponseEntity.ok(incident))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<Incident>> getAllIncidents() {
        try {
            List<Incident> incidents = incidentService.getAllIncidents();
            return ResponseEntity.ok(incidents);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/by-severity")
    public ResponseEntity<List<Incident>> getIncidentsBySeverity(@RequestParam String severity) {
        try {
            List<Incident> incidents = incidentService.getIncidentsBySeverity(severity);
            return ResponseEntity.ok(incidents);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Incident> updateIncident(@PathVariable("id") Long id, @RequestBody Map<String, Object> incidentData) {
        try {
            System.out.println("Updating incident " + id + " with data: " + incidentData);
            
            // Create incident object from map
            Incident incidentDetails = new Incident();
            
            if (incidentData.containsKey("type")) {
                incidentDetails.setType((String) incidentData.get("type"));
            }
            if (incidentData.containsKey("latitude")) {
                incidentDetails.setLatitude(((Number) incidentData.get("latitude")).doubleValue());
            }
            if (incidentData.containsKey("longtitude")) {
                incidentDetails.setLongtitude(((Number) incidentData.get("longtitude")).doubleValue());
            }
            if (incidentData.containsKey("needs")) {
                Object needsObj = incidentData.get("needs");
                if (needsObj instanceof Number) {
                    incidentDetails.setNeeds(((Number) needsObj).intValue());
                } else if (needsObj instanceof String) {
                    incidentDetails.setNeeds(Integer.parseInt((String) needsObj));
                }
            }
            if (incidentData.containsKey("severityLevel")) {
                incidentDetails.setSeverityLevel((String) incidentData.get("severityLevel"));
            }
            if (incidentData.containsKey("status")) {
                incidentDetails.setStatus((String) incidentData.get("status"));
            }
            if (incidentData.containsKey("reportedTime")) {
                String reportedTimeStr = (String) incidentData.get("reportedTime");
                if (reportedTimeStr != null) {
                    if (reportedTimeStr.length() == 10) {
                        incidentDetails.setReportedTime(LocalDateTime.parse(reportedTimeStr + "T00:00:00"));
                    } else {
                        incidentDetails.setReportedTime(LocalDateTime.parse(reportedTimeStr));
                    }
                }
            }
            
            Incident updatedIncident = incidentService.updateIncident(id, incidentDetails);
            return ResponseEntity.ok(updatedIncident);
        } catch (RuntimeException e) {
            System.err.println("Incident not found: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            System.err.println("Error updating incident: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIncident(@PathVariable("id") Long id) {
        try {
            incidentService.deleteIncident(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
