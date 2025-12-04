package com.emergency.dispatch.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.service.AssignmentService;



@RestController
@RequestMapping("/api/assignments")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AssignmentController {

    @Autowired
    private AssignmentService assignmentService;


    @PostMapping
    public ResponseEntity<?> createAssignment(@RequestBody Map<String, Long> request) {
        try {
            Long userId = request.get("userId");
            Long incidentId = request.get("incidentId");
            Long unitId = request.get("unitId");

            if (userId == null || incidentId == null || unitId == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "userId, incidentId, and unitId are required"));
            }

            Assignment assignment = assignmentService.createAssignment(userId, incidentId, unitId);
            return ResponseEntity.status(HttpStatus.CREATED).body(assignment);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }


    @PutMapping("/{id}/deactivate")
    public ResponseEntity<?> deactivateAssignment(@PathVariable Long id) {
        try {
            Assignment assignment = assignmentService.deactivateAssignment(id);
            return ResponseEntity.ok(assignment);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/resolution-time")
    public ResponseEntity<?> getResolutionTime(@PathVariable Long id) {
        try {
            Long resolutionDays = assignmentService.getResolutionTimeInDays(id);
            Map<String, Object> response = new HashMap<>();
            response.put("assignmentId", id);
            response.put("resolutionTimeInDays", resolutionDays);
            
            if (assignmentService.getAssignmentById(id).isPresent()) {
                Assignment assignment = assignmentService.getAssignmentById(id).get();
                response.put("isActive", assignment.getIsActive());
                response.put("assignmentTime", assignment.getAssignmentTime());
                response.put("resolutionTime", assignment.getResolutionTime());
            }
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAssignmentById(@PathVariable("id") Long id) {
        try {
            return assignmentService.getAssignmentById(id)
                    .map(assignment -> ResponseEntity.ok(assignment))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

   
    @GetMapping
    public ResponseEntity<?> getAllAssignments() {
        try {
            List<Assignment> assignments = assignmentService.getAllAssignments();
            return ResponseEntity.ok(assignments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    
    @GetMapping("/active")
    public ResponseEntity<?> getActiveAssignments() {
        try {
            List<Assignment> assignments = assignmentService.getActiveAssignments();
            return ResponseEntity.ok(assignments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getAssignmentsByUserId(@PathVariable("userId") Long userId) {
        try {
            List<Assignment> assignments = assignmentService.getAssignmentsByUserId(userId);
            return ResponseEntity.ok(assignments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @GetMapping("/unit/{unitId}")
    public ResponseEntity<?> getAssignmentsByUnitId(@PathVariable("unitId") Long unitId) {
        try {
            List<Assignment> assignments = assignmentService.getAssignmentsByUnitId(unitId);
            return ResponseEntity.ok(assignments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}/active")
    public ResponseEntity<?> getActiveAssignmentsByUserId(@PathVariable Long userId) {
        try {
            List<Assignment> assignments = assignmentService.getActiveAssignmentsByUserId(userId);
            return ResponseEntity.ok(assignments);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @GetMapping("/unit/{unitId}/active")
    public ResponseEntity<?> getActiveAssignmentsByUnitId(@PathVariable Long unitId) {
        try {
            List<Assignment> assignments = assignmentService.getActiveAssignmentsByUnitId(unitId);
            return ResponseEntity.ok(assignments);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAssignment(@PathVariable("id") Long id) {
        try {
            assignmentService.deleteAssignment(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }
}
