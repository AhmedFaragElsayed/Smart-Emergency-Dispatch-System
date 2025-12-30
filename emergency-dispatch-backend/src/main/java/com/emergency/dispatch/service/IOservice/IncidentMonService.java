package com.emergency.dispatch.service.IOservice;

import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.enums.SeverityLevel;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.model.Notification;
import com.emergency.dispatch.model.User;
import com.emergency.dispatch.repository.IncidentRepository;
import com.emergency.dispatch.repository.UserRepository;
import com.emergency.dispatch.service.NotificationService;
import com.emergency.dispatch.service.IncidentMonitorService; 
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
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    // We inject the OTHER monitor service to safely broadcast the color change
    @Autowired
    private IncidentMonitorService incidentMonitorService; 

    private Thread monitorThread;
    private final AtomicBoolean running = new AtomicBoolean(false);
    
    // Check every 10 seconds
    private static final long CHECK_INTERVAL_MS = 10_000; 
    // Trigger notification after 2 minutes (120,000 ms)
    private static final long CRITICAL_THRESHOLD_MS = 120_000; 

    private volatile boolean monitoringEnabled = true;

    // Keep your existing thread methods if you use them, but @Scheduled is preferred
    public void startMonitor() {
        if (monitorThread != null && monitorThread.isAlive()) return;
        running.set(true);
        monitorThread = new Thread(() -> {
            while (running.get()) {
                try {
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

    public void enableMonitoring() {
        monitoringEnabled = true;
    }

    public void disableMonitoring() {
        monitoringEnabled = false;
    }

    public List<Incident> getOverdueIncidents() {
        long now = System.currentTimeMillis();
        return incidentRepository.findAll().stream()
                .filter(incident -> 
                    incident.getStatus() == IncidentStatus.PENDING &&
                    incident.getReportedTime() != null &&
                    (now - incident.getReportedTime() > CRITICAL_THRESHOLD_MS)
                )
                .toList();
    }
    
    @Scheduled(fixedDelay = CHECK_INTERVAL_MS)
    @Transactional
    public void monitorIncidents() {
        if (!monitoringEnabled) return;

        long now = System.currentTimeMillis();
        List<Incident> incidents = incidentRepository.findAll();
        
        // Fetch all users once to send notifications to everyone (e.g., all admins)
        List<User> allUsers = userRepository.findAll();

        for (Incident incident : incidents) {
            // Check: PENDING + Reported > 2 mins ago + NOT YET Critical
            if (incident.getStatus() == IncidentStatus.PENDING &&
                incident.getReportedTime() != null &&
                (now - incident.getReportedTime() > CRITICAL_THRESHOLD_MS) &&
                incident.getSeverityLevel() != SeverityLevel.CRITICAL) { // prevents duplicate alerts

                // Double check it has no active assignments
                boolean hasActiveAssignments = incident.getAssignments().stream()
                        .anyMatch(a -> Boolean.TRUE.equals(a.getIsActive()));

                if (!hasActiveAssignments) {
                    System.out.println(">>> DETECTED OVERDUE INCIDENT: " + incident.getIncidentId());

                    // 1. Escalate Severity
                    incident.setSeverityLevel(SeverityLevel.CRITICAL);
                    Incident savedIncident = incidentRepository.save(incident);

                    // 2. Broadcast the visual update (Red Color) to the map/list
                    incidentMonitorService.broadcastIncidentUpdate(savedIncident.getIncidentId());

                    // 3. Send Notification to ALL Users
                    String alertMessage = "CRITICAL: Incident #" + savedIncident.getIncidentId() + 
                                          " (" + savedIncident.getType() + ") is unassigned for > 2 mins!";

                    for (User user : allUsers) {
                        try {
                            Notification notification = new Notification();
                            notification.setUser(user); // Assign to this user
                            notification.setIncident(savedIncident);
                            notification.setMessage(alertMessage);
                            
                            // This saves to DB and sends WebSocket message to /topic/notify
                            notificationService.sendNotification(notification);
                        } catch (Exception e) {
                            System.err.println("Failed to notify user " + user.getUserID() + ": " + e.getMessage());
                        }
                    }
                }
            }
        }
    }
}