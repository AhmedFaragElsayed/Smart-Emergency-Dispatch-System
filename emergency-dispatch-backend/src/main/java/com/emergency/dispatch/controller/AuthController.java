package com.emergency.dispatch.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.emergency.dispatch.dto.SigninRequestUser;
import com.emergency.dispatch.service.UserService;

import lombok.RequiredArgsConstructor;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;

    @PostMapping("signin")
    public ResponseEntity<?> signin(@RequestBody SigninRequestUser request) {
        
        String userName = request.getUserName();
        String password = request.getPassword();

        String userId = userService.checkVaildation(userName, password);

        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }
        return ResponseEntity.ok(Map.of("id", userId));
    }
    
}
