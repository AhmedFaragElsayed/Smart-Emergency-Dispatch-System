package com.emergency.dispatch.controller;

import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.service.EmergencyUnitService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import java.util.List;

@Controller
public class EmergencyUnitWebSocketController {
    @Autowired
    private EmergencyUnitService emergencyUnitService;

    // Client subscribes to /topic/emergency-units to receive real-time updates
    @MessageMapping("/units/subscribe")
    @SendTo("/topic/emergency-units")
    public List<EmergencyUnit> getAllUnits() {
        return emergencyUnitService.getAllEmergencyUnits();
    }
}
