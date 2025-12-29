package com.emergency.dispatch.service.IOservice;

import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class IncidentMonService {
    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    private Thread monitorThread;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private static final long CHECK_INTERVAL_MS = 10_000; // check every 10 seconds
    private static final long CRITICAL_THRESHOLD_MS = 120_000; // 2 minutes

    private volatile boolean monitoringEnabled = false;

    public void startMonitor() {
        if (monitorThread != null && monitorThread.isAlive()) return;
        running.set(true);
        monitorThread = new Thread(() -> {
            while (running.get()) {
                try {
                    long now = System.currentTimeMillis();
                    List<Incident> incidents = incidentRepository.findAll();
                    for (Incident incident : incidents) {
                        if (incident.getStatus() == IncidentStatus.PENDING &&
                            incident.getReportedTime() != null &&
                            (now - incident.getReportedTime() > CRITICAL_THRESHOLD_MS)) {
                            // Check if incident has no assignments
                            if (incident.getAssignments() == null || incident.getAssignments().isEmpty()) {
                                incident.setSeverityLevel(com.emergency.dispatch.enums.SeverityLevel.CRITICAL);
                                incidentRepository.save(incident);
                            }
                        }
                    }
                    Thread.sleep(CHECK_INTERVAL_MS);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
        monitorThread.start();
    }

    public void stopMonitor() {
        running.set(false);
        if (monitorThread != null) monitorThread.interrupt();
    }

    public java.util.List<Incident> getOverdueIncidents() {
        long now = System.currentTimeMillis();
        java.util.List<Incident> overdue = new java.util.ArrayList<>();
        for (Incident incident : incidentRepository.findAll()) {
            if (incident.getStatus() == IncidentStatus.PENDING &&
                incident.getReportedTime() != null &&
                (now - incident.getReportedTime() > CRITICAL_THRESHOLD_MS) &&
                (incident.getAssignments() == null || incident.getAssignments().isEmpty())) {
                overdue.add(incident);
            }
        }
        return overdue;
    }

    public void broadcastIncidentUpdate(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId).orElse(null);
        if (incident != null) {
            messagingTemplate.convertAndSend("/topic/incidents-monitor/update", incident);
        }
    }

    public void broadcastIncidentDeletion(Long incidentId) {
        messagingTemplate.convertAndSend("/topic/incidents-monitor/update", "deleted:" + incidentId);
    }

    public void enableMonitoring() {
        monitoringEnabled = true;
    }

    public void disableMonitoring() {
        monitoringEnabled = false;
    }

    @Scheduled(fixedDelay = CHECK_INTERVAL_MS)
    @Transactional
    public void monitorIncidents() {
        if (!monitoringEnabled) return;
        long now = System.currentTimeMillis();
        List<Incident> incidents = incidentRepository.findAll();
        for (Incident incident : incidents) {
            if (incident.getStatus() == IncidentStatus.PENDING &&
                incident.getReportedTime() != null &&
                (now - incident.getReportedTime() > CRITICAL_THRESHOLD_MS)) {
                // Check if incident has no assignments
                if (incident.getAssignments() == null || incident.getAssignments().isEmpty()) {
                    incident.setSeverityLevel(com.emergency.dispatch.enums.SeverityLevel.CRITICAL);
                    incidentRepository.save(incident);
                }
            }
        }
    }
}
