package com.emergency.dispatch.controller.IOcontroller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.service.AssignmentService;



@Controller
public class AssignmentWebSocketController {
    @Autowired
    private AssignmentService assignmentService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    
    @MessageMapping("/assignments.getAll")
    public void getAllAssignments() {
        try {
            List<Assignment> assignments = assignmentService.getAllAssignments();
            messagingTemplate.convertAndSend("/topic/assignments/all", (Object) assignments);
        } catch (Exception e) {
            String errorMessage = "Error fetching assignments: " + e.getMessage();
            System.out.println(errorMessage);
            messagingTemplate.convertAndSend("/topic/assignments/errors", errorMessage);
        }
    }

    
    @MessageMapping("/assignments.getActive")
    public void getActiveAssignments() {
        try {
            List<Assignment> assignments = assignmentService.getActiveAssignments();
            messagingTemplate.convertAndSend("/topic/assignments/active", (Object) assignments);
        } catch (Exception e) {
            String errorMessage = "Error fetching active assignments: " + e.getMessage();
            System.out.println(errorMessage);
            messagingTemplate.convertAndSend("/topic/assignments/errors", errorMessage);
        }
    }
}
