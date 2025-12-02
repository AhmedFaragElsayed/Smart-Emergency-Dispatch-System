package com.emergency.dispatch.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.emergency.dispatch.model.Notification;
import com.emergency.dispatch.service.NotificationService;

@Controller
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/notify.sendNotification")
    public void seNotification(@Payload Notification notification){
        try {
            notificationService.sendNotification(notification);
        } catch (RuntimeException e) {
            String errorMessage = "Error: " + e.getMessage();
            System.out.println(errorMessage);
            messagingTemplate.convertAndSend("/topic/notify/errors", errorMessage);
        }
    }
}
