package com.emergency.dispatch.scheduler;

import com.emergency.dispatch.service.RedisLocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
public class LocationBroadcastScheduler {

    @Autowired
    private RedisLocationService redisLocationService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Run every 1000ms (1 second). 
    // You can lower this to 500ms if you want smoother animation, but 1000ms is very safe.
    @Scheduled(fixedRate = 1000)
    public void broadcastUnitLocations() {
        // Fetch all 175 unit locations from Redis in one go
        Map<String, Map<Object, Object>> allLocations = redisLocationService.getAllLocations();
        
        if (!allLocations.isEmpty()) {
            // Send ONE message to the frontend with ALL units
            messagingTemplate.convertAndSend("/topic/unit-location-batch", allLocations);
        }
    }
}