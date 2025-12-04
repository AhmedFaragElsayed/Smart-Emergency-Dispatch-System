package com.emergency.dispatch.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.emergency.dispatch.model.Assignment;
import com.emergency.dispatch.model.Notification;
import com.emergency.dispatch.model.User;
import com.emergency.dispatch.repository.AssignmentRepository;
import com.emergency.dispatch.repository.NotificationRepository;
import com.emergency.dispatch.repository.UserRepository;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    public User createUser(User user) {
        try {
            return userRepository.save(user);
        } catch (Exception e) {
            System.out.println("Error creating user: " + e.getMessage());
            throw new RuntimeException("Failed to create user: " + e.getMessage());
        }
    }

    public Optional<User> getUserById(Long userId) {
        return userRepository.findById(userId);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateUser(Long userId, User userDetails) {
        return userRepository.findById(userId)
                .map(user -> {
                    user.setUserName(userDetails.getUserName());
                    user.setFname(userDetails.getFname());
                    user.setLname(userDetails.getLname());
                    user.setPassword(userDetails.getPassword());
                    user.setRole(userDetails.getRole());
                    return userRepository.save(user);
                })
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
    }

    public void deleteUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found with id: " + userId);
        }
        
        try {
            System.out.println("Deleting user with ID: " + userId);
            
            // Find all assignments associated with this user
            List<Assignment> userAssignments = assignmentRepository.findByUser_UserID(userId);
            System.out.println("Found " + userAssignments.size() + " assignments for user " + userId);
            
            // Set user field to null in all assignments
            for (Assignment assignment : userAssignments) {
                System.out.println("Setting user to null in assignment: " + assignment.getAssignmentId());
                assignment.setUser(null);
                assignmentRepository.save(assignment);
            }
            System.out.println("Updated all assignments successfully");
            
            // Find all notifications associated with this user
            List<Notification> userNotifications = notificationRepository.findByUser_UserID(userId);
            System.out.println("Found " + userNotifications.size() + " notifications for user " + userId);
            
            // Set user field to null in all notifications
            for (Notification notification : userNotifications) {
                System.out.println("Setting user to null in notification: " + notification.getNotificationId());
                notification.setUser(null);
                notificationRepository.save(notification);
            }
            System.out.println("Updated all notifications successfully");
            
            // Now delete the user
            System.out.println("Deleting user from database: " + userId);
            userRepository.deleteById(userId);
            System.out.println("User deleted successfully: " + userId);
            
        } catch (Exception e) {
            System.err.println("Error during user deletion: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to delete user: " + e.getMessage(), e);
        }
    }

    public boolean userExists(Long userId) {
        return userRepository.existsById(userId);
    }

    public String checkVaildation(String userName, String password) {
        
       User user = userRepository.findUserByUserName(userName);
       if (user == null){
        return null;
       }

       if (!user.getPassword().equals(password)){
            return null;
       }
       return user.getUserID().toString();
    }
}
