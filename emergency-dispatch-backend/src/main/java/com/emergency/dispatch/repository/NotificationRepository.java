package com.emergency.dispatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.emergency.dispatch.model.Notification;

public interface NotificationRepository extends JpaRepository<Notification,Long>{

}
