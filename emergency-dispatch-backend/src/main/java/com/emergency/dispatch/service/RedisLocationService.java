package com.emergency.dispatch.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RedisLocationService {

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String KEY_PREFIX = "unit_loc:";
    private static final String ALL_UNITS_SET = "active_unit_ids";

    // Fast write to Redis (Micoseconds)
    public void updateLocation(Long unitId, Double lat, Double lon) {
        String key = KEY_PREFIX + unitId;
        // Store data as a Hash
        redisTemplate.opsForHash().put(key, "lat", String.valueOf(lat));
        redisTemplate.opsForHash().put(key, "lon", String.valueOf(lon));
        // Update timestamp so we know it's fresh
        redisTemplate.opsForHash().put(key, "ts", String.valueOf(System.currentTimeMillis()));
        
        // Add to a set of active units so we can find them later
        redisTemplate.opsForSet().add(ALL_UNITS_SET, String.valueOf(unitId));
    }

    // Retrieve all locations at once
    public Map<String, Map<Object, Object>> getAllLocations() {
        Set<String> unitIds = redisTemplate.opsForSet().members(ALL_UNITS_SET);
        if (unitIds == null || unitIds.isEmpty()) return Map.of();

        return unitIds.stream()
            .collect(Collectors.toMap(
                id -> id,
                id -> redisTemplate.opsForHash().entries(KEY_PREFIX + id)
            ));
    }
}