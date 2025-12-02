package com.emergency.dispatch.config;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.emergency.dispatch.model.Notification;

import tools.jackson.databind.ObjectMapper;

@Component
public class NotificationSocketHandler extends TextWebSocketHandler {

  private final ObjectMapper objectMapper = new ObjectMapper();
  @Override
  protected void handleTextMessage(WebSocketSession session , TextMessage message)throws Exception{
    String payload = message.getPayload();
    Notification notification = objectMapper.readValue(payload, Notification.class);

    System.out.println("Recieved: "+ notification);
    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(notification)));
  }
}
