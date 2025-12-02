package com.emergency.dispatch.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.model.EmergencyUnit;
import com.emergency.dispatch.model.User;



@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    
    
    List<Assignment> findByUser(User user);
    
    
    List<Assignment> findByEmergencyUnit(EmergencyUnit emergencyUnit);
    
   
    List<Assignment> findByIsActiveTrue();
    
   
    List<Assignment> findByEmergencyUnitAndIsActiveTrue(EmergencyUnit emergencyUnit);
    
    
    List<Assignment> findByUserAndIsActiveTrue(User user);
    
    
    Optional<Assignment> findByIncident_IncidentId(Long incidentId);
    
    
    List<Assignment> findByUser_UserID(Long userId);
    
   
    List<Assignment> findByEmergencyUnit_UnitID(Long unitId);
}
