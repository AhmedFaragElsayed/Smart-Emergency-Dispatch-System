package com.emergency.dispatch.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.emergency.dispatch.model.User;
import com.emergency.dispatch.repository.UserRepository;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

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
        if (userRepository.existsById(userId)) {
            userRepository.deleteById(userId);
        } else {
            throw new RuntimeException("User not found with id: " + userId);
        }
    }

    public boolean userExists(Long userId) {
        return userRepository.existsById(userId);
    }
}
