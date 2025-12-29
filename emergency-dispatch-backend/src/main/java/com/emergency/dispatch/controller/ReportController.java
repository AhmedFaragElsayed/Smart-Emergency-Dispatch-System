package com.emergency.dispatch.controller;

import com.emergency.dispatch.service.ReportService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping(value = "/dispatch/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadDispatchReportPdf(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Integer topN,
            @RequestParam(required = false) Integer heatmapK) {
        try {
            var parsed = ReportParams.parse(from, to);
            byte[] pdf = reportService.generateDispatchReportPdf(parsed.from, parsed.to, topN, heatmapK);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "dispatch_report.pdf");
            return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping(value = "/dispatch/metrics", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Object> dispatchMetrics(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Integer topN,
            @RequestParam(required = false) Integer heatmapK) {
        try {
            var parsed = ReportParams.parse(from, to);
            var metrics = reportService.getDispatchMetrics(parsed.from, parsed.to, topN, heatmapK);
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error generating metrics");
        }
    }

    // Simple helper to parse ISO date/time strings (made public for AnalyticsController)
    public static class ReportParams {
        public final java.time.LocalDateTime from;
        public final java.time.LocalDateTime to;
        
        public ReportParams(java.time.LocalDateTime from, java.time.LocalDateTime to) {
            this.from = from;
            this.to = to;
        }
        
        public static ReportParams parse(String fromStr, String toStr) {
            java.time.LocalDateTime from = null;
            java.time.LocalDateTime to = null;
            try {
                if (fromStr != null && !fromStr.isBlank()) {
                    from = tryParseDateTime(fromStr);
                }
                if (toStr != null && !toStr.isBlank()) {
                    to = tryParseDateTime(toStr);
                }
            } catch (Exception ignored) {}
            return new ReportParams(from, to);
        }
        
        static java.time.LocalDateTime tryParseDateTime(String s) {
            // Try ISO date-time, then ISO date
            try { return java.time.LocalDateTime.parse(s); } catch (Exception e) {}
            try { return java.time.LocalDate.parse(s).atStartOfDay(); } catch (Exception e) {}
            throw new IllegalArgumentException("Invalid date/time format: " + s);
        }
    }
}
