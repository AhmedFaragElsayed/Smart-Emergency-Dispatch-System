import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// WebSocket service for real-time incident management using STOMP
class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.connected = false;
    this.listeners = new Map();
    this.subscriptions = new Map();
    this.connecting = false; // Track if connection is in progress
    this.notifications = []; // Store notifications persistently
    this.readNotificationIds = new Set(); // Track read notifications
  }

  connect(url = 'http://localhost:9696/ws') {
    // If already connected or connecting, return existing promise
    if (this.connected) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }
    
    if (this.connecting) {
      console.log('WebSocket connection already in progress');
      return this.connectPromise;
    }

    this.connecting = true;
    this.connectPromise = new Promise((resolve, reject) => {
      try {
        // Create a SockJS connection
        const socket = new SockJS(url);
        
        // Create STOMP client
        this.stompClient = new Client({
          webSocketFactory: () => socket,
          debug: (str) => {
            console.log('STOMP Debug:', str);
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        });

        this.stompClient.onConnect = () => {
          console.log('WebSocket connected via STOMP');
          this.connected = true;
          this.connecting = false;
          this.notifyListeners('connected', { status: 'connected' });
          
          // Subscribe to topics
          this.subscribeToTopics();
          resolve();
        };

        this.stompClient.onStompError = (frame) => {
          console.error('STOMP error:', frame);
          this.connecting = false;
          this.notifyListeners('error', { error: frame });
          reject(frame);
        };

        this.stompClient.onWebSocketClose = () => {
          console.log('WebSocket disconnected');
          this.connected = false;
          this.connecting = false;
          this.notifyListeners('disconnected', { status: 'disconnected' });
        };

        this.stompClient.activate();
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        this.connecting = false;
        reject(error);
      }
    });
    
    return this.connectPromise;
  }

  subscribeToTopics() {
    // Subscribe to incident updates (individual / incremental)
    this.subscribe('/topic/incidents-monitor/update', (message) => {
      const incident = JSON.parse(message.body);
      console.log('Received incident update:', incident);
      this.notifyListeners('incidentUpdate', incident);
    });

    // Also subscribe to new incident publishes (some controllers use /topic/incidents)
    this.subscribe('/topic/incidents', (message) => {
      const body = JSON.parse(message.body);
      if (Array.isArray(body)) {
        console.log('Received incidents list:', body);
        this.notifyListeners('incidentsList', body);
      } else {
        console.log('Received new incident:', body);
        this.notifyListeners('incidentAdded', body);
      }
    });

    // Subscribe to emergency unit updates (single unit)
    this.subscribe('/topic/units-monitor/update', (message) => {
      const unit = JSON.parse(message.body);
      console.log('Received unit update:', unit);
      this.notifyListeners('unitUpdate', unit);
    });

    // Subscribe to full units list broadcasts
    this.subscribe('/topic/units-monitor', (message) => {
      const units = JSON.parse(message.body);
      console.log('Received full units list:', units);
      this.notifyListeners('unitsList', units);
    });

    // Subscribe to location updates (backend uses /topic/unit-location)
    this.subscribe('/topic/unit-location', (message) => {
      const locationUpdate = JSON.parse(message.body);
      console.log('Received unit location update:', locationUpdate);
      this.notifyListeners('unitLocation', locationUpdate);
    });

    // Keep older location-updates subscription name (if used elsewhere)
    this.subscribe('/topic/location-updates', (message) => {
      const locationUpdate = JSON.parse(message.body);
      console.log('Received location update (legacy topic):', locationUpdate);
      this.notifyListeners('locationUpdate', locationUpdate);
    });

    // Subscribe to assignment updates (single assignment)
    this.subscribe('/topic/assignments', (message) => {
      const assignment = JSON.parse(message.body);
      console.log('Received assignment update:', assignment);
      this.notifyListeners('assignmentUpdate', assignment);
    });

    // Subscribe to assignment list broadcasts (e.g., /topic/assignments/all used by simulation)
    this.subscribe('/topic/assignments/all', (message) => {
      const assignments = JSON.parse(message.body);
      console.log('Received assignments list:', assignments);
      this.notifyListeners('assignmentsList', assignments);
    });

    // Subscribe to the standard emergency-units topic used by SimulationService
    this.subscribe('/topic/emergency-units', (message) => {
      const units = JSON.parse(message.body);
      console.log('Received emergency units list:', units);
      this.notifyListeners('unitsList', units);
    });

    // Subscribe to notifications
    this.subscribe('/topic/notifications', (message) => {
      const notification = JSON.parse(message.body);
      console.log('Received notification:', notification);
      
      // Store notification persistently
      this.notifications.unshift(notification);
      
      // Notify all listeners
      this.notifyListeners('notification', notification);
    });

    // Subscribe to location updates
    this.subscribe('/topic/location-updates', (message) => {
      const locationUpdate = JSON.parse(message.body);
      console.log('Received location update:', locationUpdate);
      this.notifyListeners('locationUpdate', locationUpdate);
    });
  }

  subscribe(topic, callback) {
    if (this.stompClient && this.connected) {
      const subscription = this.stompClient.subscribe(topic, callback);
      this.subscriptions.set(topic, subscription);
      console.log(`Subscribed to ${topic}`);
    }
  }

  unsubscribe(topic) {
    if (this.subscriptions.has(topic)) {
      this.subscriptions.get(topic).unsubscribe();
      this.subscriptions.delete(topic);
      console.log(`Unsubscribed from ${topic}`);
    }
  }

  send(destination, payload) {
    if (this.stompClient && this.connected) {
      this.stompClient.publish({
        destination: destination,
        body: JSON.stringify(payload)
      });
      console.log(`Sent message to ${destination}:`, payload);
    } else {
      console.error('WebSocket is not connected');
    }
  }

  // Send a notification
  sendNotification(notification) {
    this.send('/app/notification', notification);
  }

  // Update location
  updateLocation(locationUpdate) {
    this.send('/app/location-update', locationUpdate);
  }

  // Subscribe to events
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Unsubscribe from events
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event).filter(cb => cb !== callback);
      this.listeners.set(event, callbacks);
    }
  }

  // Notify all listeners of an event
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  // Close WebSocket connection
  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      this.connected = false;
      this.connecting = false;
    }
  }

  // Get connection status
  isConnected() {
    return this.connected;
  }

  // Get all stored notifications
  getNotifications() {
    return this.notifications;
  }

  // Clear all notifications
  clearNotifications() {
    this.notifications = [];
  }

  // Remove a specific notification
  removeNotification(index) {
    this.notifications.splice(index, 1);
  }

  // Mark notification as read
  markAsRead(notificationId) {
    this.readNotificationIds.add(notificationId);
  }

  // Mark all notifications as read
  markAllAsRead(notificationIds) {
    notificationIds.forEach(id => this.readNotificationIds.add(id));
  }

  // Check if notification is read
  isNotificationRead(notificationId) {
    return this.readNotificationIds.has(notificationId);
  }

  // Get unread count for a user
  getUnreadCount(userId) {
    return this.notifications.filter(n => 
      n.user && 
      (n.user.userID === userId || n.user.userID === parseInt(userId)) &&
      n.notificationId &&
      !this.readNotificationIds.has(n.notificationId)
    ).length;
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;
