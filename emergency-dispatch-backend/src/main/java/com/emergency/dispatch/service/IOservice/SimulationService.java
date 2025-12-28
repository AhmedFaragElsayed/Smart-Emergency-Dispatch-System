package com.emergency.dispatch.service.IOservice;

import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.repository.EmergencyUnitRepository;
import com.emergency.dispatch.repository.IncidentRepository;
import com.emergency.dispatch.repository.AssignmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;



import java.util.Comparator;
import java.util.PriorityQueue;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;


import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class SimulationService {
    @Autowired
    private EmergencyUnitRepository emergencyUnitRepository;
    @Autowired
    private IncidentRepository incidentRepository;
    @Autowired
    private AssignmentRepository assignmentRepository;
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private Thread simulationThread;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public void startSimulation() {
        System.out.println("[SimulationService] startSimulation called");
        if (simulationThread != null && simulationThread.isAlive()) {
            System.out.println("[SimulationService] Simulation thread already running");
            return;
        }
        running.set(true);
        simulationThread = new Thread(() -> {
            System.out.println("[SimulationService] Simulation thread started");
            // Priority queues for incidents by type and severity
            Queue<Incident> fireIncidents = new PriorityQueue<>(Comparator.comparing((Incident i) -> i.getSeverityLevel()).reversed());
            Queue<Incident> policeIncidents = new PriorityQueue<>(Comparator.comparing((Incident i) -> i.getSeverityLevel()).reversed());
            Queue<Incident> ambulanceIncidents = new PriorityQueue<>(Comparator.comparing((Incident i) -> i.getSeverityLevel()).reversed());
            // Lists for free units by type
            java.util.List<EmergencyUnit> fireUnits = new java.util.ArrayList<>();
            java.util.List<EmergencyUnit> policeUnits = new java.util.ArrayList<>();
            java.util.List<EmergencyUnit> ambulanceUnits = new java.util.ArrayList<>();
            while (running.get()) {
                try {
                    // Clear and refill queues
                    fireIncidents.clear(); policeIncidents.clear(); ambulanceIncidents.clear();
                    fireUnits.clear(); policeUnits.clear(); ambulanceUnits.clear();
                    for (Incident incident : incidentRepository.findAll()) {
                        if (incident.getStatus() == IncidentStatus.PENDING) {
                            switch (incident.getType()) {
                                case FIRE -> fireIncidents.add(incident);
                                case POLICE -> policeIncidents.add(incident);
                                case AMBULANCE -> ambulanceIncidents.add(incident);
                            }
                        }
                    }
                    for (EmergencyUnit unit : emergencyUnitRepository.findAll()) {
                        if (Boolean.TRUE.equals(unit.getStatus())) {
                            switch (unit.getType()) {
                                case FIRE -> fireUnits.add(unit);
                                case POLICE -> policeUnits.add(unit);
                                case AMBULANCE -> ambulanceUnits.add(unit);
                            }
                        }
                    }
                    // Assign units to incidents by type and severity
                    if (!fireUnits.isEmpty()) assignUnitsToIncidents(fireUnits, fireIncidents);
                    if (!policeUnits.isEmpty()) assignUnitsToIncidents(policeUnits, policeIncidents);
                    if (!ambulanceUnits.isEmpty()) assignUnitsToIncidents(ambulanceUnits, ambulanceIncidents);
                    Thread.sleep(1000); // Check every second
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
        simulationThread.start();
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        // Haversine formula
        final int R = 6371; // Radius of the earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // distance in km
    }

    private void assignUnitsToIncidents(java.util.List<EmergencyUnit> unitList, Queue<Incident> incidentQueue) {
        System.out.println("[SimulationService] assignUnitsToIncidents called. Units: " + unitList.size() + ", Incidents: " + incidentQueue.size());
        java.util.List<EmergencyUnit> availableUnits = new java.util.ArrayList<>(unitList);
        final double INITIAL_RADIUS = 2.0; // km
        final double MAX_RADIUS = 50.0; // km
        final double RADIUS_MULTIPLIER = 2.0;
        while (!availableUnits.isEmpty() && !incidentQueue.isEmpty()) {
            Incident incident = incidentQueue.poll(); // Highest priority incident
            double radius = INITIAL_RADIUS;
            EmergencyUnit nearestUnit = null;
            double minDistance = Double.MAX_VALUE;
            boolean found = false;
            while (!found && radius <= MAX_RADIUS) {
                for (EmergencyUnit unit : availableUnits) {
                    double dist = calculateDistance(
                        incident.getLatitude(), incident.getLongtitude(),
                        unit.getLatitude(), unit.getLongtitude()
                    );
                    if (dist <= radius && dist < minDistance) {
                        minDistance = dist;
                        nearestUnit = unit;
                        found = true;
                    }
                }
                if (!found) {
                    radius *= RADIUS_MULTIPLIER;
                }
            }
            if (nearestUnit != null) {
                System.out.println("[SimulationService] Assigning unit " + nearestUnit.getUnitID() + " to incident " + incident.getIncidentId());
                nearestUnit.setStatus(false); // busy
                emergencyUnitRepository.save(nearestUnit);
                // Create and save assignment
                Assignment assignment = new Assignment();
                assignment.setAssignmentTime(java.time.LocalDate.now());
                assignment.setIncident(incident);
                assignment.setEmergencyUnit(nearestUnit);
                assignment.setIsActive(true);
                assignmentRepository.save(assignment);
                availableUnits.remove(nearestUnit);
                incident.setStatus(IncidentStatus.DISPATCH);
                incidentRepository.save(incident);
                // Broadcast updated assignments list
                messagingTemplate.convertAndSend("/topic/assignments/all", assignmentRepository.findAll());
                // Broadcast updated units list for real-time status
                messagingTemplate.convertAndSend("/topic/emergency-units", emergencyUnitRepository.findAll());
                // Broadcast updated incidents list for real-time status
                messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
            } else {
                System.out.println("[SimulationService] No available unit found for incident " + incident.getIncidentId() + " within max radius " + MAX_RADIUS + " km");
            }
        }
    }

    public void stopSimulation() {
        running.set(false);
        if (simulationThread != null) simulationThread.interrupt();
    }
}
