package com.emergency.dispatch.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    private final SimpMessageSendingOperations messagingTemplate;

    public WebSocketEventListener(SimpMessageSendingOperations messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        logger.info("New WebSocket connection established. Session ID: {}", sessionId);
        
        // You can add additional logic here, such as:
        // - Storing the session ID
        // - Sending a welcome message
        // - Notifying other users about the new connection
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        logger.info("WebSocket connection closed. Session ID: {}", sessionId);
        
        // You can add additional logic here, such as:
        // - Cleaning up session data
        // - Notifying other users about the disconnection
        // - Removing the user from active sessions
        
        // Example: Send notification to all connected clients
        messagingTemplate.convertAndSend("/topic/notifications", 
            "User disconnected: " + sessionId);
    }
}
