package com.emergency.dispatch.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RedisLocationService {

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String KEY_PREFIX = "unit_loc:";
    private static final String ALL_UNITS_SET = "active_unit_ids";

    // Fast write to Redis
    public void updateLocation(Long unitId, Double lat, Double lon) {
        String key = KEY_PREFIX + unitId;
        redisTemplate.opsForHash().put(key, "lat", String.valueOf(lat));
        redisTemplate.opsForHash().put(key, "lon", String.valueOf(lon));
        redisTemplate.opsForHash().put(key, "ts", String.valueOf(System.currentTimeMillis()));
        redisTemplate.opsForSet().add(ALL_UNITS_SET, String.valueOf(unitId));
    }

    /**
     * OPTIMIZED: Uses Redis Pipelining to fetch ALL locations in 1 network call.
     * This prevents the "N+1" network problem that was freezing your server.
     */
    public Map<String, Map<Object, Object>> getAllLocations() {
        Set<String> unitIds = redisTemplate.opsForSet().members(ALL_UNITS_SET);
        if (unitIds == null || unitIds.isEmpty()) return Map.of();

        List<String> orderedIds = new ArrayList<>(unitIds);

        // Execute in pipeline (One batch command)
        List<Object> results = redisTemplate.executePipelined(new RedisCallback<Object>() {
            public Object doInRedis(RedisConnection connection) throws DataAccessException {
                for (String id : orderedIds) {
                    connection.hGetAll((KEY_PREFIX + id).getBytes());
                }
                return null;
            }
        });

        // Map results back to IDs
        Map<String, Map<Object, Object>> finalMap = new HashMap<>();
        for (int i = 0; i < orderedIds.size(); i++) {
            @SuppressWarnings("unchecked")
            Map<Object, Object> data = (Map<Object, Object>) results.get(i);
            if (data != null && !data.isEmpty()) {
                finalMap.put(orderedIds.get(i), data);
            }
        }
        return finalMap;
    }
}