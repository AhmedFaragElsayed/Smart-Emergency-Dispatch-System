package com.emergency.dispatch.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.emergency.dispatch.service.EmergencyUnitMonitorService;



@RestController
@RequestMapping("/api/monitor")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class EmergencyUnitMonitorController {

    @Autowired
    private EmergencyUnitMonitorService monitorService;

    @GetMapping("/units")
    public ResponseEntity<List<Map<String, Object>>> getAllUnitsStatus() {
        try {
            List<Map<String, Object>> unitsData = monitorService.getAllUnitsWithStatus();
            return ResponseEntity.ok(unitsData);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

@Controller
class EmergencyUnitMonitorWebSocketController {

    @Autowired
    private EmergencyUnitMonitorService monitorService;

    @MessageMapping("/monitor.requestAllUnits")
    public void requestAllUnitsStatus() {
        monitorService.broadcastAllUnitsStatus();
    }
}
