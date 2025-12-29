package com.emergency.dispatch.service.IOservice;

import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.enums.IncidentType;
import com.emergency.dispatch.enums.SeverityLevel;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.repository.IncidentRepository;
import com.emergency.dispatch.service.IncidentMonitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class IncidentGeneratorService {
    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private IncidentMonitorService incidentMonitorService;

    private static final IncidentType[] TYPES = IncidentType.values();
    private static final SeverityLevel[] SEVERITIES = SeverityLevel.values();
    private static final Random RANDOM = new Random();

    public void generateRandomIncidents(int count) {
        for (int i = 0; i < count; i++) {
            Incident incident = new Incident();
            incident.setType(TYPES[RANDOM.nextInt(TYPES.length)]);
            // Las Vegas bounds: lat 36.04–36.27, lng -115.29–-115.04
            incident.setLatitude(36.04 + RANDOM.nextDouble() * (36.27 - 36.04)); // Las Vegas
            incident.setLongtitude(-115.29 + RANDOM.nextDouble() * (-115.04 - (-115.29))); // Las Vegas
            incident.setNeeds(1 + RANDOM.nextInt(5));
            incident.setSeverityLevel(SEVERITIES[RANDOM.nextInt(SEVERITIES.length)]);
            incident.setStatus(IncidentStatus.PENDING);
            incident.setReportedTime(System.currentTimeMillis()); // store actual creation time
            Incident saved = incidentRepository.save(incident);
            // Per-incident WebSocket broadcast removed to avoid flooding; a single consolidated broadcast is sent after generation.
        }
        // Broadcast enriched incidents list (includes assignment status) to the monitor topic
        incidentMonitorService.broadcastAllIncidents();
        // Also broadcast raw list for legacy HTML clients
        messagingTemplate.convertAndSend("/topic/incidents", incidentRepository.findAll());
    }
}
