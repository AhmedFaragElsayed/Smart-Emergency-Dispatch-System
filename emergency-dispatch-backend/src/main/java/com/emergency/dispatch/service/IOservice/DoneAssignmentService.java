package com.emergency.dispatch.service.IOservice;

import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.model.Incident;
import com.emergency.dispatch.repository.AssignmentRepository;
import com.emergency.dispatch.repository.EmergencyUnitRepository;
import com.emergency.dispatch.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class DoneAssignmentService {
    @Autowired
    private AssignmentRepository assignmentRepository;
    @Autowired
    private EmergencyUnitRepository emergencyUnitRepository;
    @Autowired
    private IncidentRepository incidentRepository;

    public void completeAssignmentByIncidentId(Long incidentId) {
        List<Assignment> assignments = assignmentRepository.findByIncident_IncidentId(incidentId);
        for (Assignment assignment : assignments) {
            assignment.setIsActive(false);
            if (assignment.getAssignmentTime() != null) {
                assignment.setResolutionTime(System.currentTimeMillis() - assignment.getAssignmentTime()); // duration in ms
            } else {
                assignment.setResolutionTime(null);
            }
            assignmentRepository.save(assignment);
            EmergencyUnit unit = assignment.getEmergencyUnit();
            if (unit != null) {
                unit.setStatus(true); // available
                emergencyUnitRepository.save(unit);
            }
        }
        Incident incident = incidentRepository.findById(incidentId).orElse(null);
        if (incident != null) {
            incident.setStatus(IncidentStatus.COMPLETED);
            incidentRepository.save(incident);
        }
    }

    public List<Incident> getCompletedIncidents() {
        return incidentRepository.findAll().stream()
                .filter(incident -> incident.getStatus() == IncidentStatus.COMPLETED)
                .toList();
    }

    public List<Incident> getLiveIncidents() {
        return incidentRepository.findAll().stream()
                .filter(incident -> incident.getStatus() != com.emergency.dispatch.enums.IncidentStatus.COMPLETED)
                .toList();
    }
}
