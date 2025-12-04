import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import websocketService from '../services/websocketService';
import '../styles/NotificationBell.css';

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      console.log('No user logged in for notifications');
      return;
    }

    console.log('Setting up notifications for user:', user);

    // Load existing notifications from the service
    const existingNotifications = websocketService.getNotifications()
      .filter(n => n.user && (n.user.userID === user.id || n.user.userID === parseInt(user.id)));
    
    setNotifications(existingNotifications);
    
    // Get unread count from service (persistent across page changes)
    setUnreadCount(websocketService.getUnreadCount(user.id));

    // Subscribe to new notifications
    const handleNotification = (notification) => {
      console.log('Received notification:', notification);
      console.log('Current user ID:', user.id);
      console.log('Notification user ID:', notification.user?.userID);
      
      // Check if notification is for this user
      if (notification.user && (notification.user.userID === user.id || notification.user.userID === parseInt(user.id))) {
        console.log('Adding notification to list');
        setNotifications(prev => [notification, ...prev]);
        
        // Update unread count from service
        setUnreadCount(websocketService.getUnreadCount(user.id));
      } else {
        console.log('Notification not for this user, ignoring');
      }
    };

    websocketService.on('notification', handleNotification);

    return () => {
      websocketService.off('notification', handleNotification);
    };
  }, [user]);

  const handleBellClick = () => {
    const wasOpen = showDropdown;
    setShowDropdown(!showDropdown);
    
    // Mark all as read when opening dropdown
    if (!wasOpen) {
      const notificationIds = notifications
        .filter(n => n.notificationId)
        .map(n => n.notificationId);
      
      websocketService.markAllAsRead(notificationIds);
      setUnreadCount(0);
    }
  };

  const clearNotifications = () => {
    // Clear notifications from service (for all users)
    const userNotifications = websocketService.getNotifications()
      .filter(n => n.user && (n.user.userID === user.id || n.user.userID === parseInt(user.id)));
    
    // Remove user's notifications from the service
    userNotifications.forEach(() => {
      const allNotifications = websocketService.getNotifications();
      const index = allNotifications.findIndex(n => 
        n.user && (n.user.userID === user.id || n.user.userID === parseInt(user.id))
      );
      if (index !== -1) {
        websocketService.removeNotification(index);
      }
    });
    
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell-button" 
        onClick={handleBellClick}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button 
                className="clear-btn" 
                onClick={clearNotifications}
              >
                Clear All
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div key={index} className="notification-item">
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  {notification.notificationTime && (
                    <div className="notification-time">
                      {new Date(notification.notificationTime).toLocaleString()}
                    </div>
                  )}
                  {notification.incident && (
                    <div className="notification-details">
                      Incident #{notification.incident.incidentId} - {notification.incident.type}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
