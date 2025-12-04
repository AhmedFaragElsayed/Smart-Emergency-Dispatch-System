package com.emergency.dispatch.repository;

import java.util.List;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.model.User;



@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    
    
    // Find all assignments for a specific user
    List<Assignment> findByUser(User user);
    
    // Find all assignments for a specific emergency unit
    List<Assignment> findByEmergencyUnit(EmergencyUnit emergencyUnit);
    
    // Find all active assignments
    List<Assignment> findByIsActiveTrue();
    
    // Find active assignments for a specific emergency unit
    List<Assignment> findByEmergencyUnitAndIsActiveTrue(EmergencyUnit emergencyUnit);
    
    // Find active assignments for a specific user
    List<Assignment> findByUserAndIsActiveTrue(User user);
    
    // Find all assignments by incident ID
    List<Assignment> findByIncident_IncidentId(Long incidentId);
    
    // Find active assignments by incident ID
    List<Assignment> findByIncident_IncidentIdAndIsActiveTrue(Long incidentId);
    
    // Find all assignments by user ID
    List<Assignment> findByUser_UserID(Long userId);
    
    // Find all assignments by emergency unit ID
    List<Assignment> findByEmergencyUnit_UnitID(Long unitId);
}
