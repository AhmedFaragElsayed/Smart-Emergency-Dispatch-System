package com.emergency.dispatch.service.IOservice;

import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.enums.EmergencyUnitType;
import com.emergency.dispatch.repository.EmergencyUnitRepository;
import com.emergency.dispatch.service.EmergencyUnitMonitorService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class EmergencyUnitGeneratorService {
    @Autowired
    private EmergencyUnitRepository emergencyUnitRepository;

    @Autowired
    private EmergencyUnitMonitorService monitorService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public List<EmergencyUnit> generateRandomEmergencyUnits(int count) {
        List<EmergencyUnit> createdUnits = new ArrayList<>();
        EmergencyUnitType[] types = EmergencyUnitType.values();
        Random rand = new Random();
        for (int i = 0; i < count; i++) {
            EmergencyUnit unit = new EmergencyUnit();
            unit.setType(types[rand.nextInt(types.length)]);
            unit.setLatitude(40.7000 + rand.nextDouble() * 0.13); // Manhattan: 40.7000–40.8300
            unit.setLongtitude(-74.0200 + rand.nextDouble() * 0.12); // Manhattan: -74.0200–-73.9000
            unit.setCapacity(rand.nextInt(5) + 1); // Capacity 1-5
            unit.setStatus(true); 
            EmergencyUnit savedUnit = emergencyUnitRepository.save(unit);
            monitorService.broadcastUnitStatusUpdate(savedUnit.getUnitID());
            createdUnits.add(savedUnit);
        }
        // Broadcast the full updated list to /topic/emergency-units
        List<EmergencyUnit> allUnits = emergencyUnitRepository.findAll();
        messagingTemplate.convertAndSend("/topic/emergency-units", allUnits);
        return createdUnits;
    }
}
