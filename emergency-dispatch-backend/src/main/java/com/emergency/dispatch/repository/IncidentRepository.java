package com.emergency.dispatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.emergency.dispatch.enums.IncidentStatus;
import com.emergency.dispatch.model.Incident;

import java.util.List;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {
    // Find all incidents that are not completed
    List<Incident> findByStatusIn(List<IncidentStatus> statuses);

    List<Incident> findByStatus(IncidentStatus status);
}
