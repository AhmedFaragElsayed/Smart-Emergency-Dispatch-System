package com.emergency.dispatch.controller;

import com.emergency.dispatch.service.ReportService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

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
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Error generating analytics");
            errorResponse.put("message", e.getMessage() != null ? e.getMessage() : "Unknown error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}
