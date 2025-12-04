package com.emergency.dispatch.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.emergency.dispatch.model.Notification;

public interface NotificationRepository extends JpaRepository<Notification,Long>{
    
    // Find all notifications by user ID
    List<Notification> findByUser_UserID(Long userId);

}
