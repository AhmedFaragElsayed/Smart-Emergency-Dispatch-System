package com.emergency.dispatch.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.service.EmergencyUnitService;

@Controller
public class LocationUpdateController {

    @Autowired
    private EmergencyUnitService emergencyUnitService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/unit.updateLocation")
    public void updateLocation(@Payload Map<String, Object> locationData) {
        try {
            Long unitId = Long.valueOf(locationData.get("unitId").toString());
            Double latitude = Double.valueOf(locationData.get("latitude").toString());
            Double longitude = Double.valueOf(locationData.get("longitude").toString());
            
            // Update the location in the database
            EmergencyUnit updatedUnit = emergencyUnitService.updateLocation(unitId, latitude, longitude);
            
            // Broadcast the location update to all subscribers
            Map<String, Object> locationUpdate = Map.of(
                "unitId", updatedUnit.getUnitID(),
                "latitude", updatedUnit.getLatitude(),
                "longtitude", updatedUnit.getLongtitude(),
                "type", updatedUnit.getType(),
                "status", updatedUnit.getStatus(),
                "timestamp", System.currentTimeMillis()
            );
            
            messagingTemplate.convertAndSend("/topic/unit-location", (Object) locationUpdate);
            
        } catch (RuntimeException e) {
            String errorMessage = "Error updating location: " + e.getMessage();
            System.out.println(errorMessage);
            messagingTemplate.convertAndSend("/topic/unit-location/errors", errorMessage);
        } catch (Exception e) {
            String errorMessage = "Unexpected error: " + e.getMessage();
            System.out.println(errorMessage);
            messagingTemplate.convertAndSend("/topic/unit-location/errors", errorMessage);
        }
    }
}
