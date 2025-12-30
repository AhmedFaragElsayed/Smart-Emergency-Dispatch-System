package com.emergency.dispatch.service.IOservice;

import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.enums.SeverityLevel;
import com.emergency.dispatch.repository.EmergencyUnitRepository;
import com.emergency.dispatch.repository.IncidentRepository;
import com.emergency.dispatch.repository.AssignmentRepository;
import com.emergency.dispatch.service.RedisLocationService; // Ensure this exists from previous steps

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CompletableFuture;
import java.util.HashMap;
import java.util.Locale;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Queue;
import java.util.concurrent.atomic.AtomicBoolean;
import java.time.Duration;
import java.time.LocalDateTime;

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
    
    // Inject Redis Template for fast location updates
    @Autowired
    private StringRedisTemplate redisTemplate;
    
    // Redis Keys
    private static final String KEY_PREFIX = "unit_loc:";
    private static final String ALL_UNITS_SET = "active_unit_ids";

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
            
            while (running.get()) {
                try {
                    // 1. Move Units (Updates Redis, NOT Database)
                    processUnitMovements(); 
                    
                    // 2. Optimized Dispatching
                    performSmartDispatching();

                    // Sleep 1 second (Tick)
                    Thread.sleep(1000); 
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
        simulationThread.start();
    }

    /**
     * Smart Dispatching Logic:
     * 1. Fetches only PENDING incidents and AVAILABLE units.
     * 2. Syncs Unit locations from Redis (since DB is stale).
     * 3. Sorts Incidents by Severity (Critical first) -> Waiting Time (Oldest first).
     * 4. Matches nearest appropriate unit.
     */
    private void performSmartDispatching() {
        // Fetch only relevant data
        List<Incident> pendingIncidents = incidentRepository.findByStatus(IncidentStatus.PENDING);
        if (pendingIncidents.isEmpty()) return;

        List<EmergencyUnit> availableUnits = emergencyUnitRepository.findByStatus(true); // true = Available
        if (availableUnits.isEmpty()) return;

        // Sync local unit objects with their latest location from Redis
        // This ensures our distance calculation uses the real-time location
        syncUnitLocationsFromRedis(availableUnits);

        // Sort Incidents: Critical > High > Medium > Low. Tie-breaker: Oldest first.
        pendingIncidents.sort((i1, i2) -> {
            int severityCompare = Integer.compare(getSeverityWeight(i2.getSeverityLevel()), getSeverityWeight(i1.getSeverityLevel()));
            if (severityCompare != 0) return severityCompare;
            return i1.getReportedTime().compareTo(i2.getReportedTime()); // Oldest time first
        });

        List<EmergencyUnit> assignedUnits = new ArrayList<>();
        List<Incident> assignedIncidents = new ArrayList<>();

        for (Incident incident : pendingIncidents) {
            // Filter units by matching type
            List<EmergencyUnit> candidateUnits = availableUnits.stream()
                .filter(u -> u.getType().toString().equalsIgnoreCase(incident.getType().toString()))
                .toList();

            if (candidateUnits.isEmpty()) continue;

            // Find nearest unit
            EmergencyUnit nearestUnit = null;
            double minDistance = Double.MAX_VALUE;
            double MAX_DISPATCH_RADIUS_KM = 50.0;

            for (EmergencyUnit unit : candidateUnits) {
                double dist = calculateDistance(incident.getLatitude(), incident.getLongtitude(),
                                              unit.getLatitude(), unit.getLongtitude());
                if (dist < minDistance && dist <= MAX_DISPATCH_RADIUS_KM) {
                    minDistance = dist;
                    nearestUnit = unit;
                }
            }

            if (nearestUnit != null) {
                assignUnit(nearestUnit, incident);
                
                // Remove from available pool for this tick so it's not double-assigned
                availableUnits.remove(nearestUnit);
                assignedUnits.add(nearestUnit);
                assignedIncidents.add(incident);
            }
        }
    }

    private void assignUnit(EmergencyUnit unit, Incident incident) {
        System.out.println("[SmartDispatch] Assigning Unit " + unit.getUnitID() + " to " + incident.getSeverityLevel() + " Incident " + incident.getIncidentId());

        // Update DB State for assignment
        unit.setStatus(false); // Busy
        emergencyUnitRepository.save(unit);

        incident.setStatus(IncidentStatus.DISPATCH);
        incidentRepository.save(incident);

        // Create Assignment Record
        Assignment assignment = new Assignment();
        assignment.setAssignmentTime(System.currentTimeMillis());
        assignment.setIncident(incident);
        assignment.setEmergencyUnit(unit);
        assignment.setIsActive(true);
        assignmentRepository.save(assignment);

        // Calculate Route
        CompletableFuture.runAsync(() -> fetchAndStoreRoute(unit, incident));

        // Broadcast Updates
        messagingTemplate.convertAndSend("/topic/assignments/all", assignmentRepository.findAll());
        messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
        // Note: Unit status update will be picked up by the Redis Scheduler automatically
    }

    private void syncUnitLocationsFromRedis(List<EmergencyUnit> units) {
        for (EmergencyUnit unit : units) {
            String key = KEY_PREFIX + unit.getUnitID();
            Object latStr = redisTemplate.opsForHash().get(key, "lat");
            Object lonStr = redisTemplate.opsForHash().get(key, "lon");

            if (latStr != null && lonStr != null) {
                try {
                    unit.setLatitude(Double.valueOf(latStr.toString()));
                    unit.setLongtitude(Double.valueOf(lonStr.toString()));
                } catch (NumberFormatException e) {
                    // Ignore, keep DB value
                }
            }
        }
    }

    private int getSeverityWeight(SeverityLevel level) {
        if (level == null) return 0;
        switch (level) {
            case CRITICAL: return 4;
            case MEDIUM: return 2;
            case LOW: return 1;
            default: return 0;
        }
    }

    /**
     * High-speed movement processing.
     * Updates Redis ONLY. Does NOT touch the Database.
     */
    private void processUnitMovements() {
        if (activeRoutes.isEmpty()) return;

        final int SPEED_FACTOR = 5; 

        activeRoutes.forEach((unitId, route) -> {
            if (!route.isEmpty()) {
                double[] point = null;
                // Move multiple steps for speed
                for(int i=0; i<SPEED_FACTOR && !route.isEmpty(); i++) {
                    point = route.poll();
                }
                
                if (point != null) {
                    // Update Redis
                    String key = KEY_PREFIX + unitId;
                    redisTemplate.opsForHash().put(key, "lat", String.valueOf(point[0]));
                    redisTemplate.opsForHash().put(key, "lon", String.valueOf(point[1]));
                    redisTemplate.opsForHash().put(key, "ts", String.valueOf(System.currentTimeMillis()));
                    redisTemplate.opsForSet().add(ALL_UNITS_SET, String.valueOf(unitId));
                }
            } else {
                // Route finished
                activeRoutes.remove(unitId);
                handleArrivalAtIncident(unitId);
            }
        });
    }

    private void handleArrivalAtIncident(Long unitId) {
        // We need to fetch the unit from DB to get the assignment details
        emergencyUnitRepository.findById(unitId).ifPresent(unit -> {
            // Update the DB with the final location (Sync point)
            // We only save to DB on arrival, not during movement
            Object lat = redisTemplate.opsForHash().get(KEY_PREFIX + unitId, "lat");
            Object lon = redisTemplate.opsForHash().get(KEY_PREFIX + unitId, "lon");
            if (lat != null) unit.setLatitude(Double.valueOf(lat.toString()));
            if (lon != null) unit.setLongtitude(Double.valueOf(lon.toString()));
            emergencyUnitRepository.save(unit);

            List<Assignment> activeAssignments = assignmentRepository.findByEmergencyUnitAndIsActiveTrue(unit);
            
            if (!activeAssignments.isEmpty()) {
                Assignment assignment = activeAssignments.get(0);
                Long incidentId = assignment.getIncident().getIncidentId();

                CompletableFuture.runAsync(() -> {
                    try {
                        long workDuration = (long) (Math.random() * 4000) + 1000;
                        System.out.println("[Simulation] Unit " + unitId + " working at Incident " + incidentId);
                        Thread.sleep(workDuration);
                        
                        doneAssignmentService.completeAssignmentByIncidentId(incidentId);
                        
                        // Broadcast completion
                        messagingTemplate.convertAndSend("/topic/assignments/all", assignmentRepository.findAll());
                        messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
            }
        });
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private void fetchAndStoreRoute(EmergencyUnit unit, Incident incident) {
        try {
            // Ensure we use the Unit's CURRENT location (from Redis if available)
            String key = KEY_PREFIX + unit.getUnitID();
            String latStr = (String) redisTemplate.opsForHash().get(key, "lat");
            String lonStr = (String) redisTemplate.opsForHash().get(key, "lon");
            
            double startLat = (latStr != null) ? Double.parseDouble(latStr) : unit.getLatitude();
            double startLon = (lonStr != null) ? Double.parseDouble(lonStr) : unit.getLongtitude();

            String coordinates = String.format(Locale.US, "%f,%f;%f,%f", 
                startLon, startLat, 
                incident.getLongtitude(), incident.getLatitude());
            
            String url = "http://router.project-osrm.org/route/v1/driving/" + coordinates + "?geometries=geojson&overview=full";
            
            String response = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(response);
            
            if (root.path("code").asText().equals("Ok")) {
                JsonNode geometry = root.path("routes").get(0).path("geometry").path("coordinates");
                Queue<double[]> path = new ConcurrentLinkedQueue<>();
                List<double[]> pathCoordinates = new ArrayList<>();
                
                if (geometry.isArray()) {
                    for (JsonNode coord : geometry) {
                        double lon = coord.get(0).asDouble();
                        double lat = coord.get(1).asDouble();
                        path.add(new double[]{lat, lon});
                        pathCoordinates.add(new double[]{lat, lon});
                    }
                }
                activeRoutes.put(unit.getUnitID(), path);
                broadcastRoutePath(unit.getUnitID(), incident.getType().toString(), pathCoordinates);
            }
        } catch (Exception e) {
            System.err.println("[Simulation] Failed to fetch OSRM route: " + e.getMessage());
        }
    }

    private void broadcastRoutePath(Long unitId, String incidentType, List<double[]> pathCoordinates) {
        try {
            Map<String, Object> routeData = new HashMap<>();
            routeData.put("unitId", unitId);
            routeData.put("incidentType", incidentType);
            routeData.put("path", pathCoordinates);
            messagingTemplate.convertAndSend("/topic/unit-route", (Object) routeData);
        } catch (Exception e) {
            System.err.println("[Simulation] Failed to broadcast route path: " + e.getMessage());
        }
    }

    public void stopSimulation() {
        running.set(false);
        if (simulationThread != null) {
            simulationThread.interrupt();
            simulationThread = null;
        }
    }
}