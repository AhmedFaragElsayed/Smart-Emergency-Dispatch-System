package com.emergency.dispatch.controller;

import com.emergency.dispatch.service.ReportService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final ReportService reportService;

    public AnalyticsController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping(value = "/dispatch", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Object> dispatchAnalytics(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Integer topN,
            @RequestParam(required = false) Integer heatmapK) {
        try {
            var parsed = ReportController.ReportParams.parse(from, to);
            var metrics = reportService.getDispatchMetrics(parsed.from, parsed.to, topN, heatmapK);
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error generating analytics", "message", e.getMessage()));
        }
    }

    private static class Map {
        static java.util.Map<String, String> of(String k1, String v1, String k2, String v2) {
            java.util.Map<String, String> m = new java.util.HashMap<>();
            m.put(k1, v1);
            m.put(k2, v2);
            return m;
        }
    }
}
