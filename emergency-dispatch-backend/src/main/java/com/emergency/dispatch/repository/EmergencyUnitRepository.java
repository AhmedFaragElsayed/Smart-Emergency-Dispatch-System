package com.emergency.dispatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.emergency.dispatch.model.EmergencyUnit;

@Repository
public interface EmergencyUnitRepository extends JpaRepository<EmergencyUnit, Long> {

}
