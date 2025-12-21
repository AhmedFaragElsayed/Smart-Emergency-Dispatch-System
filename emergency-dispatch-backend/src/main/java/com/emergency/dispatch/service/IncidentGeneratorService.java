package com.emergency.dispatch.service;

import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.enums.IncidentType;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
public class IncidentGeneratorService {
    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private static final IncidentType[] TYPES = IncidentType.values();
    private static final String[] SEVERITIES = {"LOW", "MEDIUM", "HIGH"};
    private static final Random RANDOM = new Random();

    public void generateRandomIncidents(int count) {
        for (int i = 0; i < count; i++) {
            Incident incident = new Incident();
            incident.setType(TYPES[RANDOM.nextInt(TYPES.length)]);
            incident.setLatitude(24.0 + RANDOM.nextDouble() * 2.0); // Example: 24-26
            incident.setLongtitude(32.0 + RANDOM.nextDouble() * 2.0); // Example: 32-34
            incident.setNeeds(1 + RANDOM.nextInt(5));
            incident.setSeverityLevel(SEVERITIES[RANDOM.nextInt(SEVERITIES.length)]);
            incident.setStatus(IncidentStatus.PENDING);
            incident.setReportedTime(LocalDateTime.now().minusMinutes(RANDOM.nextInt(60)));
            Incident saved = incidentRepository.save(incident);
            messagingTemplate.convertAndSend("/topic/incidents", saved);
        }
    }
}
