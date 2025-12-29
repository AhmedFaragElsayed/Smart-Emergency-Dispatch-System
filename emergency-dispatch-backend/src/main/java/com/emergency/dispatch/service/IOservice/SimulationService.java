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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.client.RestTemplate;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CompletableFuture;
import java.util.HashMap;
import java.util.Locale;


import java.util.Comparator;
import java.util.PriorityQueue;
import java.util.Queue;
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
    @Autowired
    private DoneAssignmentService doneAssignmentService;


    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    // Store active routes: UnitID -> Queue of [Lat, Lon] points
    private final Map<Long, Queue<double[]>> activeRoutes = new ConcurrentHashMap<>();
    
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
                    processUnitMovements(); 
                    
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
            
                EmergencyUnit finalUnit = nearestUnit;
                Incident finalIncident = incident;
                
                // Run this in a separate thread so the loop continues immediately
                CompletableFuture.runAsync(() -> fetchAndStoreRoute(finalUnit, finalIncident));

                // Create and save assignment
                Assignment assignment = new Assignment();
                assignment.setAssignmentTime(System.currentTimeMillis()); // store actual assignment time in ms
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

    

    private void processUnitMovements() {
        if (activeRoutes.isEmpty()) return;

        java.util.List<EmergencyUnit> unitsToUpdate = new java.util.ArrayList<>();
        
        final int SPEED_FACTOR = 5; 

        activeRoutes.forEach((unitId, route) -> {
            if (!route.isEmpty()) {
                double[] point = null;
                
                // Consume multiple points to simulate speed
                for(int i=0; i<SPEED_FACTOR && !route.isEmpty(); i++) {
                    point = route.poll();
                }
                
                if (point != null) {
                    double[] finalPoint = point; // effective final for lambda
                    emergencyUnitRepository.findById(unitId).ifPresent(unit -> {
                        unit.setLatitude(finalPoint[0]);
                        unit.setLongtitude(finalPoint[1]); 
                        unitsToUpdate.add(unit);
                        
                        Map<String, Object> update = new HashMap<>();
                        update.put("unitId", unit.getUnitID());
                        update.put("latitude", unit.getLatitude());
                        update.put("longtitude", unit.getLongtitude());
                        update.put("type", unit.getType());
                        update.put("status", unit.getStatus());

                        messagingTemplate.convertAndSend("/topic/unit-location", (Object) update);
                    });
                }
            } else {
                activeRoutes.remove(unitId);
                
                // Retrieve unit to find its assignment
                emergencyUnitRepository.findById(unitId).ifPresent(unit -> {
                    java.util.List<Assignment> activeAssignments = assignmentRepository.findByEmergencyUnitAndIsActiveTrue(unit);
                    
                    if (!activeAssignments.isEmpty()) {
                        Assignment assignment = activeAssignments.get(0);
                        Long incidentId = assignment.getIncident().getIncidentId();

                        // Start async task to simulate work and then resolve
                        CompletableFuture.runAsync(() -> {
                            try {
                                // Random sleep between 1s (1000ms) and 30s (30000ms)
                                long workDuration = (long) (Math.random() * 29000) + 1000;
                                System.out.println("[Simulation] Unit " + unitId + " arrived at Incident " + incidentId + ". Working for " + workDuration + "ms...");
                                Thread.sleep(workDuration);
                                
                                // Mark assignment as done using DoneAssignmentService
                                doneAssignmentService.completeAssignmentByIncidentId(incidentId);
                                System.out.println("[Simulation] Incident " + incidentId + " resolved by Unit " + unitId);

                                // Broadcast updates so UI reflects completion
                                messagingTemplate.convertAndSend("/topic/assignments/all", assignmentRepository.findAll());
                                messagingTemplate.convertAndSend("/topic/emergency-units", emergencyUnitRepository.findAll());
                                messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
                                
                            } catch (Exception e) {
                                System.err.println("[Simulation] Error completing assignment: " + e.getMessage());
                                e.printStackTrace();
                            }
                        });
                    }
                });
            }
        });

        if (!unitsToUpdate.isEmpty()) {
            emergencyUnitRepository.saveAll(unitsToUpdate);
        }
    }

    private void fetchAndStoreRoute(EmergencyUnit unit, Incident incident) {
        try {
            // OSRM requires "lon,lat" format. API is free for fair use.
            // Using US locale to ensure dots instead of commas for decimals
            String coordinates = String.format(Locale.US, "%f,%f;%f,%f", 
                unit.getLongtitude(), unit.getLatitude(), 
                incident.getLongtitude(), incident.getLatitude());
            
            String url = "http://router.project-osrm.org/route/v1/driving/" + coordinates + "?geometries=geojson&overview=full";
            
            String response = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(response);
            
            if (root.path("code").asText().equals("Ok")) {
                JsonNode geometry = root.path("routes").get(0).path("geometry").path("coordinates");
                Queue<double[]> path = new ConcurrentLinkedQueue<>();
                java.util.List<double[]> pathCoordinates = new java.util.ArrayList<>();
                
                if (geometry.isArray()) {
                    for (JsonNode coord : geometry) {
                        // OSRM returns [lon, lat]
                        double lon = coord.get(0).asDouble();
                        double lat = coord.get(1).asDouble();
                        path.add(new double[]{lat, lon});
                        pathCoordinates.add(new double[]{lat, lon});
                    }
                }
                activeRoutes.put(unit.getUnitID(), path);
                System.out.println("[Simulation] Route fetched for Unit " + unit.getUnitID() + ": " + path.size() + " points.");
                
                // Broadcast the route path to the frontend for visualization
                broadcastRoutePath(unit.getUnitID(), incident.getType().toString(), pathCoordinates);
            }
        } catch (Exception e) {
            System.err.println("[Simulation] Failed to fetch OSRM route: " + e.getMessage());
        }
    }

    private void broadcastRoutePath(Long unitId, String incidentType, java.util.List<double[]> pathCoordinates) {
        try {
            Map<String, Object> routeData = new HashMap<>();
            routeData.put("unitId", unitId);
            routeData.put("incidentType", incidentType);
            routeData.put("path", pathCoordinates);
            messagingTemplate.convertAndSend("/topic/unit-route", (Object) routeData);
            System.out.println("[Simulation] Route path broadcast for Unit " + unitId);
        } catch (Exception e) {
            System.err.println("[Simulation] Failed to broadcast route path: " + e.getMessage());
        }
    }

    public void stopSimulation() {
        running.set(false);
        // Preserve activeRoutes so ongoing unit routes are not lost when pausing the simulation.
        // This allows restarting the simulation to resume movement from where it stopped.
        if (simulationThread != null) {
            simulationThread.interrupt();
            simulationThread = null;
        }
    }
}