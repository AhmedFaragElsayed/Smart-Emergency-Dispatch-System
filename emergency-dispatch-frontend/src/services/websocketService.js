import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// WebSocket service for real-time incident management using STOMP
class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.connected = false;
    this.listeners = new Map();
    this.subscriptions = new Map();
  }

  connect(url = 'http://localhost:9696/ws') {
    return new Promise((resolve, reject) => {
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
          this.notifyListeners('connected', { status: 'connected' });
          
          // Subscribe to topics
          this.subscribeToTopics();
          resolve();
        };

        this.stompClient.onStompError = (frame) => {
          console.error('STOMP error:', frame);
          this.notifyListeners('error', { error: frame });
          reject(frame);
        };

        this.stompClient.onWebSocketClose = () => {
          console.log('WebSocket disconnected');
          this.connected = false;
          this.notifyListeners('disconnected', { status: 'disconnected' });
        };

        this.stompClient.activate();
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        reject(error);
      }
    });
  }

  subscribeToTopics() {
    // Subscribe to incident updates
    this.subscribe('/topic/incidents-monitor/update', (message) => {
      const incident = JSON.parse(message.body);
      console.log('Received incident update:', incident);
      this.notifyListeners('incidentUpdate', incident);
    });

    // Subscribe to emergency unit updates
    this.subscribe('/topic/units-monitor/update', (message) => {
      const unit = JSON.parse(message.body);
      console.log('Received unit update:', unit);
      this.notifyListeners('unitUpdate', unit);
    });

    // Subscribe to assignment updates
    this.subscribe('/topic/assignments', (message) => {
      const assignment = JSON.parse(message.body);
      console.log('Received assignment update:', assignment);
      this.notifyListeners('assignmentUpdate', assignment);
    });

    // Subscribe to notifications
    this.subscribe('/topic/notifications', (message) => {
      const notification = JSON.parse(message.body);
      console.log('Received notification:', notification);
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
    }
  }

  // Get connection status
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;
