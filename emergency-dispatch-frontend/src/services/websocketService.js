// src/services/websocketService.js
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.client = null;
    this.subscriptions = new Map();
    this.notifications = [];
    this.connectPromise = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      if (this.client && this.client.active) {
        this.isConnected = true;
        resolve();
        return;
      }

      this.client = new Client({
        webSocketFactory: () => new SockJS('http://localhost:9696/ws'),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        
        onConnect: () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          
          // Subscribe to default topics
          this.subscribeToTopics();
          
          resolve();
        },
        
        onStompError: (frame) => {
          console.error('❌ WebSocket STOMP error:', frame);
          this.emit('error', frame);
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Max reconnection attempts reached'));
          } else {
            reject(frame);
          }
        },
        
        onDisconnect: () => {
          console.log('🔌 WebSocket disconnected');
          this.isConnected = false;
          this.subscriptions.clear();
          this.emit('disconnected');
        },
        
        onWebSocketError: (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.emit('error', error);
        }
      });

      this.client.activate();
    });

    return this.connectPromise;
  }

  subscribeToTopics() {
    // Unit updates
    this.subscribe('/topic/unitUpdate', (message) => {
      try {
        const unit = JSON.parse(message.body);
        console.log('📡 Received unit update:', unit);
        this.emit('unitUpdate', unit);
      } catch (error) {
        console.error('Error parsing unit update:', error);
      }
    });

    // Unit locations
    this.subscribe('/topic/unitLocation', (message) => {
      try {
        const location = JSON.parse(message.body);
        console.log('📍 Received unit location:', location);
        this.emit('unitLocation', location);
      } catch (error) {
        console.error('Error parsing unit location:', error);
      }
    });

    // Unit lists
    this.subscribe('/topic/unitsList', (message) => {
      try {
        const units = JSON.parse(message.body);
        console.log('📋 Received units list:', units.length, 'units');
        this.emit('unitsList', units);
      } catch (error) {
        console.error('Error parsing units list:', error);
      }
    });

    // Incident updates
    this.subscribe('/topic/incidentUpdate', (message) => {
      try {
        const incident = JSON.parse(message.body);
        console.log('🚨 Received incident update:', incident);
        this.emit('incidentUpdate', incident);
      } catch (error) {
        console.error('Error parsing incident update:', error);
      }
    });

    // New incidents
    this.subscribe('/topic/incidentAdded', (message) => {
      try {
        const incident = JSON.parse(message.body);
        console.log('🆕 New incident added:', incident);
        this.emit('incidentAdded', incident);
      } catch (error) {
        console.error('Error parsing new incident:', error);
      }
    });

    // Incident lists
    this.subscribe('/topic/incidentsList', (message) => {
      try {
        const incidents = JSON.parse(message.body);
        console.log('📊 Received incidents list:', incidents.length, 'incidents');
        this.emit('incidentsList', incidents);
      } catch (error) {
        console.error('Error parsing incidents list:', error);
      }
    });

    // Monitor incidents
    this.subscribe('/topic/incidentsMonitorList', (message) => {
      try {
        const incidents = JSON.parse(message.body);
        console.log('📈 Received monitor incidents:', incidents.length, 'incidents');
        this.emit('incidentsMonitorList', incidents);
      } catch (error) {
        console.error('Error parsing monitor incidents:', error);
      }
    });

    // Assignment updates
    this.subscribe('/topic/assignmentUpdate', (message) => {
      try {
        const assignment = JSON.parse(message.body);
        console.log('📝 Received assignment update:', assignment);
        this.emit('assignmentUpdate', assignment);
      } catch (error) {
        console.error('Error parsing assignment update:', error);
      }
    });

    // Assignment lists
    this.subscribe('/topic/assignmentsList', (message) => {
      try {
        const assignments = JSON.parse(message.body);
        console.log('📑 Received assignments list:', assignments.length, 'assignments');
        this.emit('assignmentsList', assignments);
      } catch (error) {
        console.error('Error parsing assignments list:', error);
      }
    });

    // Notifications
    this.subscribe('/topic/notifications', (message) => {
      try {
        const notification = JSON.parse(message.body);
        console.log('🔔 Received notification:', notification);
        this.handleNotification(notification);
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    });

    // Simulation status
    this.subscribe('/topic/simulation', (message) => {
      const status = message.body;
      console.log('🎮 Simulation status:', status);
      this.emit('simulationStatus', status);
    });
  }

  subscribe(destination, callback) {
    if (!this.client || !this.client.connected) {
      console.error('Cannot subscribe: WebSocket not connected');
      return null;
    }

    try {
      const subscription = this.client.subscribe(destination, callback);
      this.subscriptions.set(destination, subscription);
      console.log(`✅ Subscribed to ${destination}`);
      return subscription;
    } catch (error) {
      console.error(`Error subscribing to ${destination}:`, error);
      return null;
    }
  }

  unsubscribe(destination) {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
      console.log(`✅ Unsubscribed from ${destination}`);
    }
  }

  send(destination, body) {
    if (!this.client || !this.client.connected) {
      console.error('Cannot send: WebSocket not connected');
      return false;
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(body)
      });
      console.log(`📤 Sent message to ${destination}:`, body);
      return true;
    } catch (error) {
      console.error(`Error sending to ${destination}:`, error);
      return false;
    }
  }

  disconnect() {
    if (this.client) {
      this.subscriptions.clear();
      this.client.deactivate();
      this.client = null;
      this.connectPromise = null;
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected');
    }
  }

  // Event emitter pattern
  events = new Map();

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);
  }

  off(event, callback) {
    if (this.events.has(event)) {
      this.events.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  // Notification handling
  handleNotification(notificationData) {
    let notification;
    
    if (typeof notificationData === 'string') {
      // Simple string notification
      notification = {
        id: Date.now(),
        message: notificationData,
        notificationTime: new Date().toISOString(),
        isRead: false
      };
    } else {
      // Full notification object
      notification = {
        ...notificationData,
        id: notificationData.notificationId || Date.now()
      };
    }

    this.notifications.unshift(notification);
    this.emit('notification', notification);
  }

  getNotifications(userId = null) {
    if (userId) {
      return this.notifications.filter(n => 
        n.user && (n.user.userID === userId || n.user.userID === parseInt(userId))
      );
    }
    return this.notifications;
  }

  removeNotification(index) {
    if (index >= 0 && index < this.notifications.length) {
      this.notifications.splice(index, 1);
    }
  }

  markAllAsRead(notificationIds = []) {
    this.notifications.forEach(notification => {
      if (notificationIds.length === 0 || notificationIds.includes(notification.id)) {
        notification.isRead = true;
      }
    });
  }

  getUnreadCount(userId) {
    return this.getNotifications(userId).filter(n => !n.isRead).length;
  }
}

export default new WebSocketService();