package com.emergency.dispatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.emergency.dispatch.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
}
