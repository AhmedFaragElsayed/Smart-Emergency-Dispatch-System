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
    // dedupe by incidentId or notificationId
    const seen = new Map();
    const unique = [];
    existingNotifications.forEach(n => {
      const key = (n.notificationId ? `nid:${n.notificationId}` : '') || (n.incident && n.incident.incidentId ? `inc:${n.incident.incidentId}` : n.message);
      if (!seen.has(key)) { seen.set(key, true); unique.push(n); }
    });
    setNotifications(unique);
    
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

    const handleNotificationUpdated = (updated) => {
      // Replace existing notification in list if present
      setNotifications((prev) => {
        const idx = prev.findIndex(n => (n.notificationId && updated.notificationId && n.notificationId === updated.notificationId) || (n.incident && updated.incident && (n.incident.incidentId === updated.incident.incidentId)));
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        // if not found but matches current user, add
        if (updated.user && (updated.user.userID === user.id || updated.user.userID == user.id)) {
          return [updated, ...prev];
        }
        return prev;
      });
      setUnreadCount(websocketService.getUnreadCount(user.id));
    };

    websocketService.on('notification', handleNotification);
    websocketService.on('notificationUpdated', handleNotificationUpdated);

    return () => {
      websocketService.off('notification', handleNotification);
      websocketService.off('notificationUpdated', handleNotificationUpdated);
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
    // Clear notifications from service for this user
    const userNotifications = websocketService.getNotifications()
      .filter(n => n.user && (n.user.userID === user.id || n.user.userID === parseInt(user.id)));

    userNotifications.forEach(n => {
      if (n.notificationId) websocketService.removeNotificationById(n.notificationId);
    });

    setNotifications([]);
    setUnreadCount(0);
  };

  const handleDeleteNotification = (notificationId) => {
    websocketService.removeNotificationById(notificationId);
    setNotifications((prev) => prev.filter(n => n.notificationId !== notificationId));
    setUnreadCount(websocketService.getUnreadCount(user.id));
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
                <div key={notification.notificationId || index} className="notification-item">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div className="notification-message">{notification.message}</div>
                    <button className="clear-btn" style={{marginLeft:'8px'}} onClick={() => handleDeleteNotification(notification.notificationId)}>Delete</button>
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
