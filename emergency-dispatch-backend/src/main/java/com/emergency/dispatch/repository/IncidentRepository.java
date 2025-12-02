package com.emergency.dispatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.emergency.dispatch.model.Incident;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {

}
