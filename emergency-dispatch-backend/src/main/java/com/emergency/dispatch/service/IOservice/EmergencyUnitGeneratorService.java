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
            unit.setLatitude(36.04 + rand.nextDouble() * (36.27 - 36.04)); // Las Vegas bounds, match incidents
            unit.setLongtitude(-115.29 + rand.nextDouble() * (-115.04 - (-115.29))); // Las Vegas bounds, match incidents
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
