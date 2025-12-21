package com.emergency.dispatch.controller;

import com.emergency.dispatch.model.Incident;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class IncidentWebSocketController {
    @MessageMapping("/incidents/stream")
    @SendTo("/topic/incidents")
    public Incident streamIncident(Incident incident) {
        
        return incident;
    }
}
