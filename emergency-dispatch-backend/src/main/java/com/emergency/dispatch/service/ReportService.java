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
    LocalDateTime fromDt = (from == null) ? LocalDateTime.now().minusDays(30) : from;
    LocalDateTime toDt = (to == null) ? LocalDateTime.now() : to;
    int topLimit = (topN == null || topN <= 0) ? 5 : Math.min(topN, 50);
    int heatmapLimit = (heatmapK == null || heatmapK <= 0) ? 10 : Math.min(heatmapK, 200);

    Map<String, Object> result = new HashMap<>();

    // Incident counts by type in range
    List<Map<String, Object>> incidentsByType = jdbcTemplate.queryForList(
        "SELECT type, COUNT(*) AS cnt FROM incident WHERE reported_time BETWEEN ? AND ? GROUP BY type",
        fromDt, toDt);
    result.put("incidentsByType", incidentsByType);

    // Incident status distribution
    List<Map<String, Object>> incidentsByStatus = jdbcTemplate.queryForList(
        "SELECT status, COUNT(*) AS cnt FROM incident WHERE reported_time BETWEEN ? AND ? GROUP BY status",
        fromDt, toDt);
    result.put("incidentsByStatus", incidentsByStatus);

    // Incident severity distribution
    List<Map<String, Object>> incidentsBySeverity = jdbcTemplate.queryForList(
        "SELECT severity_level AS severity, COUNT(*) AS cnt FROM incident WHERE reported_time BETWEEN ? AND ? GROUP BY severity_level",
        fromDt, toDt);
    result.put("incidentsBySeverity", incidentsBySeverity);

    // Average resolution days overall (assignments in range)
    Double avgDaysOverall = jdbcTemplate.queryForObject(
        "SELECT AVG(DATEDIFF(resolution_time, assignment_time)) FROM assignment WHERE resolution_time IS NOT NULL AND assignment_time BETWEEN ? AND ?",
        Double.class,
        Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    result.put("avgResolutionDays", avgDaysOverall);

    // Average/min/max resolution days by incident type
    List<Map<String, Object>> avgDaysByType = jdbcTemplate.queryForList(
        "SELECT i.type, " +
            "AVG(DATEDIFF(a.resolution_time, a.assignment_time)) AS avgDays, " +
            "MIN(DATEDIFF(a.resolution_time, a.assignment_time)) AS minDays, " +
            "MAX(DATEDIFF(a.resolution_time, a.assignment_time)) AS maxDays " +
            "FROM assignment a JOIN incident i ON a.incident_id = i.incident_id " +
            "WHERE a.resolution_time IS NOT NULL AND a.assignment_time BETWEEN ? AND ? " +
            "GROUP BY i.type",
        Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    result.put("responseTimeByType", avgDaysByType);

    // Response time stats by day
    List<Map<String, Object>> responseByDay = jdbcTemplate.queryForList(
        "SELECT DATE(a.assignment_time) AS day, " +
            "AVG(DATEDIFF(a.resolution_time, a.assignment_time)) AS avgDays, " +
            "MIN(DATEDIFF(a.resolution_time, a.assignment_time)) AS minDays, " +
            "MAX(DATEDIFF(a.resolution_time, a.assignment_time)) AS maxDays " +
            "FROM assignment a " +
            "WHERE a.resolution_time IS NOT NULL AND a.assignment_time BETWEEN ? AND ? " +
            "GROUP BY DATE(a.assignment_time) ORDER BY day",
        Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    result.put("responseTimeByDay", responseByDay);

    // Response time stats by month
    List<Map<String, Object>> responseByMonth = jdbcTemplate.queryForList(
        "SELECT DATE_FORMAT(a.assignment_time, '%Y-%m') AS month, " +
            "AVG(DATEDIFF(a.resolution_time, a.assignment_time)) AS avgDays, " +
            "MIN(DATEDIFF(a.resolution_time, a.assignment_time)) AS minDays, " +
            "MAX(DATEDIFF(a.resolution_time, a.assignment_time)) AS maxDays " +
            "FROM assignment a " +
            "WHERE a.resolution_time IS NOT NULL AND a.assignment_time BETWEEN ? AND ? " +
            "GROUP BY DATE_FORMAT(a.assignment_time, '%Y-%m') ORDER BY month",
        Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    result.put("responseTimeByMonth", responseByMonth);

    // Utilization ratio (active assignments vs capacity)
    Integer totalActive = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM assignment WHERE is_active = 1 AND assignment_time BETWEEN ? AND ?",
        Integer.class,
        Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    Integer totalCapacity = jdbcTemplate.queryForObject("SELECT COALESCE(SUM(capacity),0) FROM emergency_unit", Integer.class);
    Double utilization = (totalCapacity == null || totalCapacity == 0) ? 0.0 : (double) totalActive / totalCapacity;
    result.put("utilizationRatio", utilization);

    // Utilization by unit type
    List<Map<String, Object>> utilizationByType = jdbcTemplate.queryForList(
        "SELECT eu.type AS unitType, " +
            "SUM(CASE WHEN a.is_active = 1 THEN 1 ELSE 0 END) AS activeAssignments, " +
            "SUM(eu.capacity) AS totalCapacity, " +
            "CASE WHEN SUM(eu.capacity)=0 THEN 0 ELSE SUM(CASE WHEN a.is_active = 1 THEN 1 ELSE 0 END)/SUM(eu.capacity) END AS utilization " +
            "FROM emergency_unit eu LEFT JOIN assignment a ON a.unit_id = eu.userid " +
            "AND a.assignment_time BETWEEN ? AND ? " +
            "GROUP BY eu.type",
        Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    result.put("utilizationByUnitType", utilizationByType);

    // Top performing units by avg resolution time (ascending)
    List<Map<String, Object>> topUnitsByAvgResolution = jdbcTemplate.queryForList(
        "SELECT a.unit_id AS unitId, AVG(DATEDIFF(a.resolution_time, a.assignment_time)) AS avgDays " +
            "FROM assignment a " +
            "WHERE a.resolution_time IS NOT NULL AND a.assignment_time BETWEEN ? AND ? " +
            "GROUP BY a.unit_id ORDER BY avgDays ASC LIMIT "+ topLimit,
        Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    result.put("topUnitsByAvgResolution", topUnitsByAvgResolution);

    // Top units by assignment counts
    List<Map<String, Object>> topUnitsByCount = jdbcTemplate.queryForList(
        "SELECT unit_id AS unitId, COUNT(*) AS assignments FROM assignment WHERE assignment_time BETWEEN ? AND ? GROUP BY unit_id ORDER BY assignments DESC LIMIT "+ topLimit,
        Date.valueOf(fromDt.toLocalDate()), Date.valueOf(toDt.toLocalDate()));
    result.put("topUnitsByAssignmentCount", topUnitsByCount);

    // Incident volume trends by day (last range)
    List<Map<String, Object>> incidentsByDay = jdbcTemplate.queryForList(
        "SELECT DATE(reported_time) AS day, COUNT(*) AS cnt FROM incident WHERE reported_time BETWEEN ? AND ? GROUP BY DATE(reported_time) ORDER BY day",
        fromDt, toDt);
    result.put("incidentsByDay", incidentsByDay);

    // Heatmap buckets (rounded lat/lon)
    List<Map<String, Object>> heatmapBuckets = jdbcTemplate.queryForList(
        "SELECT ROUND(latitude,2) AS lat, ROUND(longtitude,2) AS lon, COUNT(*) AS cnt FROM incident " +
            "WHERE reported_time BETWEEN ? AND ? GROUP BY ROUND(latitude,2), ROUND(longtitude,2) ORDER BY cnt DESC LIMIT "+ heatmapLimit,
        fromDt, toDt);
    result.put("incidentHeatmapTop", heatmapBuckets);

    return result;
    }

    public byte[] generateDispatchReportPdf(LocalDateTime from, LocalDateTime to, Integer topN, Integer heatmapK) throws JRException {
    Map<String, Object> metrics = getDispatchMetrics(from, to, topN, heatmapK);
    List<ReportRow> rows = new ArrayList<>();

    // Flatten metrics into label/value rows
    @SuppressWarnings("unchecked") List<Map<String,Object>> byType = (List<Map<String,Object>>) metrics.get("incidentsByType");
    for (Map<String,Object> r : byType) {
        rows.add(new ReportRow("Incidents by type: " + String.valueOf(r.get("type")), String.valueOf(r.get("cnt"))));
    }

    Double avgDaysOverall = (Double) metrics.get("avgResolutionDays");
    rows.add(new ReportRow("Average resolution time (days)", avgDaysOverall == null ? "N/A" : String.format("%.2f", avgDaysOverall)));

    @SuppressWarnings("unchecked") List<Map<String,Object>> topUnits = (List<Map<String,Object>>) metrics.get("topUnitsByAssignmentCount");
    int rank = 1;
    for (Map<String,Object> u : topUnits) {
        rows.add(new ReportRow("Top unit #"+rank+" by assignments (id="+ String.valueOf(u.get("unitId")) +")", String.valueOf(u.get("assignments"))));
        rank++;
    }

    @SuppressWarnings("unchecked") List<Map<String,Object>> heatmap = (List<Map<String,Object>>) metrics.get("incidentHeatmapTop");
    for (Map<String,Object> cell : heatmap) {
        rows.add(new ReportRow("Hotspot lat="+ String.valueOf(cell.get("lat")) +", lon="+ String.valueOf(cell.get("lon")), String.valueOf(cell.get("cnt"))));
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
