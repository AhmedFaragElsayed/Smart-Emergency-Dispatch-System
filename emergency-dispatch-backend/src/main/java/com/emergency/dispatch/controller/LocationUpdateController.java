package com.emergency.dispatch.controller;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;
import com.emergency.dispatch.service.RedisLocationService;

@Controller
public class LocationUpdateController {

    @Autowired
    private RedisLocationService redisLocationService;

    @MessageMapping("/unit.updateLocation")
    public void updateLocation(@Payload Map<String, Object> locationData) {
        try {
            Long unitId = Long.valueOf(locationData.get("unitId").toString());
            Double latitude = Double.valueOf(locationData.get("latitude").toString());
            Double longitude = Double.valueOf(locationData.get("longitude").toString());

            // 1. FAST: Write only to Redis. No Database. No Broadcast.
            redisLocationService.updateLocation(unitId, latitude, longitude);

        } catch (Exception e) {
            System.err.println("Error processing location update: " + e.getMessage());
        }
    }
}