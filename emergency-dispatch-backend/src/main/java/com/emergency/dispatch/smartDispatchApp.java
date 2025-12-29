package com.emergency.dispatch;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main application class for Emergency Dispatch System
 */
@SpringBootApplication
@EnableScheduling
public class smartDispatchApp {
    public static void main(String[] args) {
        SpringApplication.run(smartDispatchApp.class, args);
    }
}
