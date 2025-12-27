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
        if (simulationThread != null && simulationThread.isAlive()) return;
        running.set(true);
        simulationThread = new Thread(() -> {
            // Priority queues for incidents by type and severity
            Queue<Incident> fireIncidents = new PriorityQueue<>(Comparator.comparing((Incident i) -> i.getSeverityLevel()).reversed());
            Queue<Incident> policeIncidents = new PriorityQueue<>(Comparator.comparing((Incident i) -> i.getSeverityLevel()).reversed());
            Queue<Incident> ambulanceIncidents = new PriorityQueue<>(Comparator.comparing((Incident i) -> i.getSeverityLevel()).reversed());
            // Queues for free units by type
            Queue<EmergencyUnit> fireUnits = new ConcurrentLinkedQueue<>();
            Queue<EmergencyUnit> policeUnits = new ConcurrentLinkedQueue<>();
            Queue<EmergencyUnit> ambulanceUnits = new ConcurrentLinkedQueue<>();
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
                    assignUnitsToIncidents(fireUnits, fireIncidents);
                    assignUnitsToIncidents(policeUnits, policeIncidents);
                    assignUnitsToIncidents(ambulanceUnits, ambulanceIncidents);
                    Thread.sleep(1000); // Check every second
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
        simulationThread.start();
    }

    private void assignUnitsToIncidents(Queue<EmergencyUnit> unitQueue, Queue<Incident> incidentQueue) {
        while (!unitQueue.isEmpty() && !incidentQueue.isEmpty()) {
            EmergencyUnit unit = unitQueue.poll();
            Incident incident = incidentQueue.poll();
            unit.setStatus(false); // busy
            incident.setStatus(IncidentStatus.DISPATCH);
            emergencyUnitRepository.save(unit);
            incidentRepository.save(incident);
            // Create and save assignment
            Assignment assignment = new Assignment();
            assignment.setAssignmentTime(java.time.LocalDate.now());
            assignment.setIncident(incident);
            assignment.setEmergencyUnit(unit);
            assignment.setIsActive(true);
            assignmentRepository.save(assignment);
            // Broadcast updated assignments list
            messagingTemplate.convertAndSend("/topic/assignments/all", assignmentRepository.findAll());
            // Broadcast updated units list for real-time status
            messagingTemplate.convertAndSend("/topic/emergency-units", emergencyUnitRepository.findAll());
            // Broadcast updated incidents list for real-time status
            messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
        }
    }

    public void stopSimulation() {
        running.set(false);
        if (simulationThread != null) simulationThread.interrupt();
    }
}
