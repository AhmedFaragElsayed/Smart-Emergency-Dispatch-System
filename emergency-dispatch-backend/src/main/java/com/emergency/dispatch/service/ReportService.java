package com.emergency.dispatch.service;

import java.io.InputStream;
import java.sql.Date;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.emergency.dispatch.dto.ReportRow;

import lombok.AllArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

@Service
@AllArgsConstructor
public class ReportService {

    private final JdbcTemplate jdbcTemplate;

    public Map<String, Object> getDispatchMetrics(LocalDateTime from, LocalDateTime to, Integer topN, Integer heatmapK) {
    // If no date range provided, get all data
    boolean useAllData = (from == null && to == null);
    LocalDateTime fromDt = (from == null) ? LocalDateTime.now().minusYears(10) : from;
    LocalDateTime toDt = (to == null) ? LocalDateTime.now().plusDays(1) : to;
    int topLimit = (topN == null || topN <= 0) ? 5 : Math.min(topN, 50);
    int heatmapLimit = (heatmapK == null || heatmapK <= 0) ? 10 : Math.min(heatmapK, 200);

    Map<String, Object> result = new HashMap<>();

    // Incident counts by type - get all data if no filter
    List<Map<String, Object>> incidentsByType;
    if (useAllData) {
        incidentsByType = jdbcTemplate.queryForList(
            "SELECT type, COUNT(*) AS cnt FROM incident GROUP BY type");
    } else {
        incidentsByType = jdbcTemplate.queryForList(
            "SELECT type, COUNT(*) AS cnt FROM incident WHERE reported_time BETWEEN ? AND ? GROUP BY type",
            fromDt, toDt);
    }
    result.put("incidentsByType", incidentsByType);

    // Incident status distribution
    List<Map<String, Object>> incidentsByStatus;
    if (useAllData) {
        incidentsByStatus = jdbcTemplate.queryForList(
            "SELECT status, COUNT(*) AS cnt FROM incident GROUP BY status");
    } else {
        incidentsByStatus = jdbcTemplate.queryForList(
            "SELECT status, COUNT(*) AS cnt FROM incident WHERE reported_time BETWEEN ? AND ? GROUP BY status",
            fromDt, toDt);
    }
    result.put("incidentsByStatus", incidentsByStatus);

    // Incident severity distribution
    List<Map<String, Object>> incidentsBySeverity;
    if (useAllData) {
        incidentsBySeverity = jdbcTemplate.queryForList(
            "SELECT severity_level AS severity, COUNT(*) AS cnt FROM incident GROUP BY severity_level");
    } else {
        incidentsBySeverity = jdbcTemplate.queryForList(
            "SELECT severity_level AS severity, COUNT(*) AS cnt FROM incident WHERE reported_time BETWEEN ? AND ? GROUP BY severity_level",
            fromDt, toDt);
    }
    result.put("incidentsBySeverity", incidentsBySeverity);

    // Average resolution days overall (assignments in range)
    Double avgDaysOverall;
    if (useAllData) {
        avgDaysOverall = jdbcTemplate.queryForObject(
            "SELECT AVG(resolution_time/1000/60/60/24) FROM assignment WHERE resolution_time IS NOT NULL AND assignment_time IS NOT NULL",
            Double.class);
    } else {
        avgDaysOverall = jdbcTemplate.queryForObject(
            "SELECT AVG(resolution_time/1000/60/60/24) FROM assignment WHERE resolution_time IS NOT NULL AND assignment_time IS NOT NULL AND FROM_UNIXTIME(assignment_time/1000) BETWEEN ? AND ?",
            Double.class,
            Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    }
    result.put("avgResolutionDays", avgDaysOverall);

    // Average/min/max resolution days by incident type
    List<Map<String, Object>> avgDaysByType;
    if (useAllData) {
        avgDaysByType = jdbcTemplate.queryForList(
            "SELECT i.type, " +
                "AVG(a.resolution_time/1000/60/60/24) AS avgDays, " +
                "MIN(a.resolution_time/1000/60/60/24) AS minDays, " +
                "MAX(a.resolution_time/1000/60/60/24) AS maxDays " +
                "FROM assignment a JOIN incident i ON a.incident_id = i.incident_id " +
                "WHERE a.resolution_time IS NOT NULL AND a.assignment_time IS NOT NULL " +
                "GROUP BY i.type");
    } else {
        avgDaysByType = jdbcTemplate.queryForList(
            "SELECT i.type, " +
                "AVG(a.resolution_time/1000/60/60/24) AS avgDays, " +
                "MIN(a.resolution_time/1000/60/60/24) AS minDays, " +
                "MAX(a.resolution_time/1000/60/60/24) AS maxDays " +
                "FROM assignment a JOIN incident i ON a.incident_id = i.incident_id " +
                "WHERE a.resolution_time IS NOT NULL AND a.assignment_time IS NOT NULL AND FROM_UNIXTIME(a.assignment_time/1000) BETWEEN ? AND ? " +
                "GROUP BY i.type",
            Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    }
    result.put("responseTimeByType", avgDaysByType);

    // Response time stats by day
    List<Map<String, Object>> responseByDay;
    if (useAllData) {
        responseByDay = jdbcTemplate.queryForList(
            "SELECT DATE(FROM_UNIXTIME(a.assignment_time/1000)) AS day, " +
                "AVG(a.resolution_time/1000/60/60/24) AS avgDays, " +
                "MIN(a.resolution_time/1000/60/60/24) AS minDays, " +
                "MAX(a.resolution_time/1000/60/60/24) AS maxDays " +
                "FROM assignment a " +
                "WHERE a.resolution_time IS NOT NULL AND a.assignment_time IS NOT NULL " +
                "GROUP BY DATE(FROM_UNIXTIME(a.assignment_time/1000)) ORDER BY day");
    } else {
        responseByDay = jdbcTemplate.queryForList(
            "SELECT DATE(FROM_UNIXTIME(a.assignment_time/1000)) AS day, " +
                "AVG(a.resolution_time/1000/60/60/24) AS avgDays, " +
                "MIN(a.resolution_time/1000/60/60/24) AS minDays, " +
                "MAX(a.resolution_time/1000/60/60/24) AS maxDays " +
                "FROM assignment a " +
                "WHERE a.resolution_time IS NOT NULL AND a.assignment_time IS NOT NULL AND FROM_UNIXTIME(a.assignment_time/1000) BETWEEN ? AND ? " +
                "GROUP BY DATE(FROM_UNIXTIME(a.assignment_time/1000)) ORDER BY day",
            Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    }
    result.put("responseTimeByDay", responseByDay);

    // Response time stats by month
    List<Map<String, Object>> responseByMonth;
    if (useAllData) {
        responseByMonth = jdbcTemplate.queryForList(
            "SELECT DATE_FORMAT(FROM_UNIXTIME(a.assignment_time/1000), '%Y-%m') AS month, " +
                "AVG(a.resolution_time/1000/60/60/24) AS avgDays, " +
                "MIN(a.resolution_time/1000/60/60/24) AS minDays, " +
                "MAX(a.resolution_time/1000/60/60/24) AS maxDays " +
                "FROM assignment a " +
                "WHERE a.resolution_time IS NOT NULL AND a.assignment_time IS NOT NULL " +
                "GROUP BY DATE_FORMAT(FROM_UNIXTIME(a.assignment_time/1000), '%Y-%m') ORDER BY month");
    } else {
        responseByMonth = jdbcTemplate.queryForList(
            "SELECT DATE_FORMAT(FROM_UNIXTIME(a.assignment_time/1000), '%Y-%m') AS month, " +
                "AVG(a.resolution_time/1000/60/60/24) AS avgDays, " +
                "MIN(a.resolution_time/1000/60/60/24) AS minDays, " +
                "MAX(a.resolution_time/1000/60/60/24) AS maxDays " +
                "FROM assignment a " +
                "WHERE a.resolution_time IS NOT NULL AND a.assignment_time IS NOT NULL AND FROM_UNIXTIME(a.assignment_time/1000) BETWEEN ? AND ? " +
                "GROUP BY DATE_FORMAT(FROM_UNIXTIME(a.assignment_time/1000), '%Y-%m') ORDER BY month",
            Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    }
    result.put("responseTimeByMonth", responseByMonth);

    // Utilization ratio (active assignments vs capacity)
    Integer totalActive;
    if (useAllData) {
        totalActive = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM assignment WHERE is_active = 1",
            Integer.class);
    } else {
        totalActive = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM assignment WHERE is_active = 1 AND assignment_time BETWEEN ? AND ?",
            Integer.class,
            Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    }
    Integer totalCapacity = jdbcTemplate.queryForObject("SELECT COALESCE(SUM(capacity),0) FROM emergency_unit", Integer.class);
    Double utilization = (totalCapacity == null || totalCapacity == 0) ? 0.0 : (double) totalActive / totalCapacity;
    result.put("utilizationRatio", utilization);

    // Utilization by unit type
    List<Map<String, Object>> utilizationByType;
    if (useAllData) {
        utilizationByType = jdbcTemplate.queryForList(
            "SELECT eu.type AS unitType, " +
                "SUM(CASE WHEN a.is_active = 1 THEN 1 ELSE 0 END) AS activeAssignments, " +
                "SUM(eu.capacity) AS totalCapacity, " +
                "CASE WHEN SUM(eu.capacity)=0 THEN 0 ELSE SUM(CASE WHEN a.is_active = 1 THEN 1 ELSE 0 END)/SUM(eu.capacity) END AS utilization " +
                "FROM emergency_unit eu LEFT JOIN assignment a ON a.unit_id = eu.userid " +
                "GROUP BY eu.type");
    } else {
        utilizationByType = jdbcTemplate.queryForList(
            "SELECT eu.type AS unitType, " +
                "SUM(CASE WHEN a.is_active = 1 THEN 1 ELSE 0 END) AS activeAssignments, " +
                "SUM(eu.capacity) AS totalCapacity, " +
                "CASE WHEN SUM(eu.capacity)=0 THEN 0 ELSE SUM(CASE WHEN a.is_active = 1 THEN 1 ELSE 0 END)/SUM(eu.capacity) END AS utilization " +
                "FROM emergency_unit eu LEFT JOIN assignment a ON a.unit_id = eu.userid " +
                "AND a.assignment_time BETWEEN ? AND ? " +
                "GROUP BY eu.type",
            Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    }
    result.put("utilizationByUnitType", utilizationByType);

    // Top performing units by avg resolution time (ascending)
    List<Map<String, Object>> topUnitsByAvgResolution;
    if (useAllData) {
        topUnitsByAvgResolution = jdbcTemplate.queryForList(
            "SELECT a.unit_id AS unitId, AVG(a.resolution_time/1000/60/60/24) AS avgDays " +
                "FROM assignment a " +
                "WHERE a.resolution_time IS NOT NULL AND a.assignment_time IS NOT NULL " +
                "GROUP BY a.unit_id ORDER BY avgDays ASC LIMIT "+ topLimit);
    } else {
        topUnitsByAvgResolution = jdbcTemplate.queryForList(
            "SELECT a.unit_id AS unitId, AVG(a.resolution_time/1000/60/60/24) AS avgDays " +
                "FROM assignment a " +
                "WHERE a.resolution_time IS NOT NULL AND a.assignment_time IS NOT NULL AND FROM_UNIXTIME(a.assignment_time/1000) BETWEEN ? AND ? " +
                "GROUP BY a.unit_id ORDER BY avgDays ASC LIMIT "+ topLimit,
            Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    }
    result.put("topUnitsByAvgResolution", topUnitsByAvgResolution);

    // Top units by assignment counts
    List<Map<String, Object>> topUnitsByCount;
    if (useAllData) {
        topUnitsByCount = jdbcTemplate.queryForList(
            "SELECT unit_id AS unitId, COUNT(*) AS assignments FROM assignment GROUP BY unit_id ORDER BY assignments DESC LIMIT "+ topLimit);
    } else {
        topUnitsByCount = jdbcTemplate.queryForList(
            "SELECT unit_id AS unitId, COUNT(*) AS assignments FROM assignment WHERE assignment_time BETWEEN ? AND ? GROUP BY unit_id ORDER BY assignments DESC LIMIT "+ topLimit,
            Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    }
    result.put("topUnitsByAssignmentCount", topUnitsByCount);

    // Incident volume trends by day (last range)
    List<Map<String, Object>> incidentsByDay;
    if (useAllData) {
        incidentsByDay = jdbcTemplate.queryForList(
            "SELECT DATE(reported_time) AS day, COUNT(*) AS cnt FROM incident WHERE reported_time IS NOT NULL GROUP BY DATE(reported_time) ORDER BY day");
    } else {
        incidentsByDay = jdbcTemplate.queryForList(
            "SELECT DATE(reported_time) AS day, COUNT(*) AS cnt FROM incident WHERE reported_time IS NOT NULL AND reported_time BETWEEN ? AND ? GROUP BY DATE(reported_time) ORDER BY day",
            fromDt, toDt);
    }
    result.put("incidentsByDay", incidentsByDay);

    // Heatmap buckets (rounded lat/lon)
    List<Map<String, Object>> heatmapBuckets;
    if (useAllData) {
        heatmapBuckets = jdbcTemplate.queryForList(
            "SELECT ROUND(latitude,2) AS lat, ROUND(longtitude,2) AS lon, COUNT(*) AS cnt FROM incident " +
                "GROUP BY ROUND(latitude,2), ROUND(longtitude,2) ORDER BY cnt DESC LIMIT "+ heatmapLimit);
    } else {
        heatmapBuckets = jdbcTemplate.queryForList(
            "SELECT ROUND(latitude,2) AS lat, ROUND(longtitude,2) AS lon, COUNT(*) AS cnt FROM incident " +
                "WHERE reported_time BETWEEN ? AND ? GROUP BY ROUND(latitude,2), ROUND(longtitude,2) ORDER BY cnt DESC LIMIT "+ heatmapLimit,
            fromDt, toDt);
    }
    result.put("incidentHeatmapTop", heatmapBuckets);

    return result;
    }

    public byte[] generateDispatchReportPdf(LocalDateTime from, LocalDateTime to, Integer topN, Integer heatmapK) throws JRException {
    Map<String, Object> metrics = getDispatchMetrics(from, to, topN, heatmapK);
    List<ReportRow> rows = new ArrayList<>();

    // Add header info
    rows.add(new ReportRow("DISPATCH ANALYTICS REPORT", ""));
    rows.add(new ReportRow("Generated", java.time.LocalDateTime.now().toString()));
    rows.add(new ReportRow("", ""));

    // Flatten metrics into label/value rows
    @SuppressWarnings("unchecked") List<Map<String,Object>> byType = (List<Map<String,Object>>) metrics.get("incidentsByType");
    if (byType != null && !byType.isEmpty()) {
        rows.add(new ReportRow("INCIDENTS BY TYPE", ""));
        for (Map<String,Object> r : byType) {
            rows.add(new ReportRow("  " + String.valueOf(r.get("type")), String.valueOf(r.get("cnt"))));
        }
        rows.add(new ReportRow("", ""));
    }

    @SuppressWarnings("unchecked") List<Map<String,Object>> byStatus = (List<Map<String,Object>>) metrics.get("incidentsByStatus");
    if (byStatus != null && !byStatus.isEmpty()) {
        rows.add(new ReportRow("INCIDENTS BY STATUS", ""));
        for (Map<String,Object> r : byStatus) {
            rows.add(new ReportRow("  " + String.valueOf(r.get("status")), String.valueOf(r.get("cnt"))));
        }
        rows.add(new ReportRow("", ""));
    }

    @SuppressWarnings("unchecked") List<Map<String,Object>> bySeverity = (List<Map<String,Object>>) metrics.get("incidentsBySeverity");
    if (bySeverity != null && !bySeverity.isEmpty()) {
        rows.add(new ReportRow("INCIDENTS BY SEVERITY", ""));
        for (Map<String,Object> r : bySeverity) {
            rows.add(new ReportRow("  " + String.valueOf(r.get("severity")), String.valueOf(r.get("cnt"))));
        }
        rows.add(new ReportRow("", ""));
    }

    Double avgDaysOverall = (Double) metrics.get("avgResolutionDays");
    rows.add(new ReportRow("Average Resolution Time (days)", avgDaysOverall == null ? "N/A" : String.format("%.2f", avgDaysOverall)));
    
    Double utilization = (Double) metrics.get("utilizationRatio");
    rows.add(new ReportRow("Utilization Ratio", utilization == null ? "N/A" : String.format("%.2f", utilization)));
    rows.add(new ReportRow("", ""));

    // Response Time by Type
    @SuppressWarnings("unchecked") List<Map<String,Object>> responseByType = (List<Map<String,Object>>) metrics.get("responseTimeByType");
    if (responseByType != null && !responseByType.isEmpty()) {
        rows.add(new ReportRow("RESPONSE TIME BY TYPE", ""));
        for (Map<String,Object> r : responseByType) {
            String type = String.valueOf(r.get("type"));
            Object avgDays = r.get("avgDays");
            Object minDays = r.get("minDays");
            Object maxDays = r.get("maxDays");
            String avgStr = (avgDays != null) ? String.format("%.2f days", ((Number)avgDays).doubleValue()) : "N/A";
            String minStr = (minDays != null) ? String.format("%.2f days", ((Number)minDays).doubleValue()) : "N/A";
            String maxStr = (maxDays != null) ? String.format("%.2f days", ((Number)maxDays).doubleValue()) : "N/A";
            rows.add(new ReportRow("  " + type + " - Avg", avgStr));
            rows.add(new ReportRow("  " + type + " - Min", minStr));
            rows.add(new ReportRow("  " + type + " - Max", maxStr));
        }
        rows.add(new ReportRow("", ""));
    }

    // Response Time by Day
    @SuppressWarnings("unchecked") List<Map<String,Object>> responseByDay = (List<Map<String,Object>>) metrics.get("responseTimeByDay");
    if (responseByDay != null && !responseByDay.isEmpty()) {
        rows.add(new ReportRow("RESPONSE TIME BY DAY", ""));
        for (Map<String,Object> r : responseByDay) {
            String day = String.valueOf(r.get("day"));
            Object avgDays = r.get("avgDays");
            String avgStr = (avgDays != null) ? String.format("%.2f days avg", ((Number)avgDays).doubleValue()) : "N/A";
            rows.add(new ReportRow("  " + day, avgStr));
        }
        rows.add(new ReportRow("", ""));
    }

    // Top Units by Avg Resolution
    @SuppressWarnings("unchecked") List<Map<String,Object>> topByAvgRes = (List<Map<String,Object>>) metrics.get("topUnitsByAvgResolution");
    if (topByAvgRes != null && !topByAvgRes.isEmpty()) {
        rows.add(new ReportRow("TOP UNITS BY AVG RESOLUTION TIME", ""));
        int rank = 1;
        for (Map<String,Object> u : topByAvgRes) {
            Object avgDays = u.get("avgDays");
            String avgStr = (avgDays != null) ? String.format("%.2f days", ((Number)avgDays).doubleValue()) : "N/A";
            rows.add(new ReportRow("  #"+rank+" Unit ID: "+ String.valueOf(u.get("unitId")), avgStr));
            rank++;
        }
        rows.add(new ReportRow("", ""));
    }

    @SuppressWarnings("unchecked") List<Map<String,Object>> topUnits = (List<Map<String,Object>>) metrics.get("topUnitsByAssignmentCount");
    if (topUnits != null && !topUnits.isEmpty()) {
        rows.add(new ReportRow("TOP UNITS BY ASSIGNMENTS", ""));
        int rank = 1;
        for (Map<String,Object> u : topUnits) {
            rows.add(new ReportRow("  #"+rank+" Unit ID: "+ String.valueOf(u.get("unitId")), String.valueOf(u.get("assignments"))));
            rank++;
        }
        rows.add(new ReportRow("", ""));
    }

    @SuppressWarnings("unchecked") List<Map<String,Object>> heatmap = (List<Map<String,Object>>) metrics.get("incidentHeatmapTop");
    if (heatmap != null && !heatmap.isEmpty()) {
        rows.add(new ReportRow("TOP INCIDENT HOTSPOTS", ""));
        for (Map<String,Object> cell : heatmap) {
            rows.add(new ReportRow("  Lat: "+ String.valueOf(cell.get("lat")) +", Lon: "+ String.valueOf(cell.get("lon")), "Count: " + String.valueOf(cell.get("cnt"))));
        }
    }

    // Compile and fill Jasper report
    InputStream jrxml = getClass().getResourceAsStream("/reports/dispatch_report.jrxml");
    if (jrxml == null) {
        throw new JRException("Report template not found on classpath: /reports/dispatch_report.jrxml");
    }
    JasperReport jasperReport = JasperCompileManager.compileReport(jrxml);
    JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(rows);
    Map<String,Object> params = new HashMap<>();
    params.put("REPORT_TITLE", "Dispatch Efficiency & Analytics Report");
    JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, dataSource);
    return JasperExportManager.exportReportToPdf(jasperPrint);
    }
}
