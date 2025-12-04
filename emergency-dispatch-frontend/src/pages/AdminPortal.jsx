import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import IncidentCard from '../components/IncidentCard';
import EmergencyUnitCard from '../components/EmergencyUnitCard';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import websocketService from '../services/websocketService';
import apiService from '../services/apiService';
import '../styles/AdminPortal.css';

const AdminPortal = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [emergencyUnits, setEmergencyUnits] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterSeverityLevel, setFilterSeverityLevel] = useState('ALL');
  
  // User Management States
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'ADMIN'
  });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents' or 'users'

  useEffect(() => {
    loadIncidentsViaAPI();
    connectWebSocket();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && showUserManagementModal) {
      loadUsers();
    }
  }, [activeTab, showUserManagementModal]);

  const connectWebSocket = async () => {
    try {
      await websocketService.connect('http://localhost:9696/ws');
      setIsConnected(true);
      
      websocketService.on('incidentUpdate', (incident) => {
        console.log('Received incident update via WebSocket:', incident);
        setIncidents((prevIncidents) => {
          const existingIndex = prevIncidents.findIndex(
            (i) => i.incidentId === incident.incidentId
          );
          if (existingIndex >= 0) {
            const updated = [...prevIncidents];
            updated[existingIndex] = incident;
            return updated;
          } else {
            return [incident, ...prevIncidents];
          }
        });
      });

      websocketService.on('unitUpdate', (unit) => {
        console.log('Received unit update via WebSocket:', unit);
        setEmergencyUnits((prevUnits) => {
          const existingIndex = prevUnits.findIndex((u) => u.unitID === unit.unitID);
          if (existingIndex >= 0) {
            const updated = [...prevUnits];
            updated[existingIndex] = unit;
            return updated;
          } else {
            return [...prevUnits, unit];
          }
        });
      });

      websocketService.on('assignmentUpdate', (assignment) => {
        console.log('Received assignment update via WebSocket:', assignment);
        loadIncidentsViaAPI();
      });

      websocketService.on('notification', (notification) => {
        console.log('Received notification via WebSocket:', notification);
      });

      websocketService.on('connected', () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      });

      websocketService.on('disconnected', () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
      });

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setIsConnected(false);
    }
  };

  const loadIncidentsViaAPI = async () => {
    try {
      setIsConnected(true);
      const data = await apiService.fetchIncidents();
      console.log('Loaded incidents:', data);
      setIncidents(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading incidents:', error);
      setIsConnected(false);
      setLoading(false);
    }
  };

  // User Management Functions
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await apiService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users: ' + error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await apiService.createUser(newUser);
      alert('User created successfully!');
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'ADMIN'
      });
      loadUsers(); // Refresh user list
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await apiService.deleteUser(userId);
      alert('User deleted successfully!');
      loadUsers(); // Refresh user list
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + error.message);
    }
  };

  const getUnitTypeFromIncidentType = (incidentType) => {
    const typeMap = {
      'MEDICAL': 'Ambulance',
      'Medical': 'Ambulance',
      'medical': 'Ambulance',
      'FIRE': 'Fire Truck',
      'Fire': 'Fire Truck',
      'fire': 'Fire Truck',
      'POLICE': 'Police Car',
      'Police': 'Police Car',
      'police': 'Police Car'
    };
    return typeMap[incidentType] || incidentType;
  };

  const handleDispatch = async (incident) => {
    console.log('Dispatching incident:', incident);
    console.log('Incident type:', incident.type);
    setSelectedIncident(incident);

    try {
      const unitType = getUnitTypeFromIncidentType(incident.type);
      console.log('Mapped to unit type:', unitType);
      const units = await apiService.fetchEmergencyUnits(unitType);
      console.log('Loaded emergency units:', units);
      setEmergencyUnits(units);
      setShowUnitsModal(true);
    } catch (error) {
      console.error('Error fetching emergency units:', error);
      alert(`Failed to fetch emergency units: ${error.message}\n\nMake sure the backend server is running.`);
    }
  };

  const handleToggleUnitSelection = (unit) => {
    if (unit.status === true || unit.status === 'BUSY' || unit.status === 'OFFLINE') {
      return;
    }
    
    const unitId = unit.unitID || unit.id;
    setSelectedUnits((prev) => {
      if (prev.includes(unitId)) {
        return prev.filter((id) => id !== unitId);
      } else {
        return [...prev, unitId];
      }
    });
  };

  const handleAssignSelectedUnits = async () => {
    if (selectedUnits.length === 0) {
      alert('Please select at least one unit to dispatch');
      return;
    }

    console.log('Assigning units:', selectedUnits, 'to incident:', selectedIncident);

    try {
      const assignmentPromises = selectedUnits.map((unitId) =>
        apiService.assignUnit(unitId, selectedIncident.incidentId || selectedIncident.id, user.id)
      );

      await Promise.all(assignmentPromises);
      
      setShowUnitsModal(false);
      setSelectedIncident(null);
      setSelectedUnits([]);
      setEmergencyUnits([]);
      
      loadIncidentsViaAPI();
      
      alert(`${selectedUnits.length} unit(s) dispatched successfully! Incident status updated to "dispatched".`);
    } catch (error) {
      console.error('Error assigning units:', error);
      alert(`Failed to assign units: ${error.message}`);
    }
  };

  const handleAssignUnit = async (unit, incident) => {
    console.log('Assigning unit:', unit, 'to incident:', incident);

    try {
      await apiService.assignUnit(unit.unitID || unit.id, incident.incidentId || incident.id);
      setShowUnitsModal(false);
      setSelectedIncident(null);
      setSelectedUnits([]);
      setEmergencyUnits([]);
      loadIncidentsViaAPI();
      alert(`Unit ${unit.name || unit.unitID || unit.id} assigned to incident successfully!`);
    } catch (error) {
      console.error('Error assigning unit:', error);
      alert(`Failed to assign unit: ${error.message}`);
    }
  };

  const closeModal = () => {
    setShowUnitsModal(false);
    setSelectedIncident(null);
    setSelectedUnits([]);
    setEmergencyUnits([]);
  };

  const closeUserManagementModal = () => {
    setShowUserManagementModal(false);
    setActiveTab('incidents');
  };

  const getNeedsLabel = (type) => {
    const typeStr = type?.toLowerCase() || '';
    if (typeStr.includes('fire')) return 'Damaged Buildings:';
    if (typeStr.includes('medical')) return 'Injured People:';
    if (typeStr.includes('police')) return 'Criminals:';
    return 'Needs:';
  };

  const filteredIncidents = incidents.filter((incident) => {
    const incidentStatus = incident.status || 'PENDING';
    const statusMatch = filterStatus === 'ALL' || 
      incidentStatus.toUpperCase() === filterStatus.toUpperCase();
    const typeMatch = filterType === 'ALL' || incident.type?.toLowerCase() === filterType.toLowerCase();
    const severityMatch = filterSeverityLevel === 'ALL' || 
      incident.severityLevel?.toUpperCase() === filterSeverityLevel.toUpperCase();
    return statusMatch && typeMatch && severityMatch;
  });

  return (
    <div className="admin-portal">
      <header className="admin-header">
        <button className="back-button" onClick={() => navigate('/')}>← Back to Home</button>
        <h1>🚨 Emergency Dispatch Admin Portal</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <NotificationBell />
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button 
            className="manage-users-btn" 
            onClick={() => setShowUserManagementModal(true)}
          >
            👥 Manage Users
          </button>
          <button 
            className="logout-btn" 
            onClick={() => { logout(); navigate('/signin'); }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="tabs-section">
        <button 
          className={`tab-btn ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          🚨 Incidents
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Management
        </button>
      </div>

      {activeTab === 'incidents' ? (
        <>
          <div className="filters-section">
            <div className="filter-group">
              <label>Status:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Resolved</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Type:</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="ALL">All</option>
                <option value="MEDICAL">Medical</option>
                <option value="POLICE">Police</option>
                <option value="FIRE">Fire</option>
              </select>
            </div>
            <div className="filter-group">  
              <label>Severity Level</label>
              <select value={filterSeverityLevel} onChange={(e) => setFilterSeverityLevel(e.target.value)}>
                <option value="ALL">All</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>          
            </div>
            <div className="incidents-count">
              <strong>{filteredIncidents.length}</strong> incident(s)
            </div>
          </div>

          <main className="admin-content">
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Loading incidents...</p>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="no-incidents">
                <p>No incidents found</p>
              </div>
            ) : (
              <div className="incidents-grid">
                {filteredIncidents.map((incident) => (
                  <IncidentCard
                    key={incident.incidentId || incident.id}
                    incident={incident}
                    onDispatch={handleDispatch}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      ) : (
        <div className="user-management-section">
          <div className="create-user-form">
            <h3>Create New User</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              />
              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="ADMIN">Admin</option>
                <option value="DISPATCHER">Dispatcher</option>
                <option value="FIELD_AGENT">Field Agent</option>
                <option value="USER">User</option>
              </select>
              <button onClick={handleCreateUser} className="create-user-btn">
                Create User
              </button>
            </div>
          </div>

          <div className="users-list">
            <h3>Existing Users</h3>
            {loadingUsers ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <p>No users found</p>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role?.toLowerCase()}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="delete-user-btn"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Emergency Units Modal */}
      {showUnitsModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Available Emergency Units</h2>
              <button className="close-button" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {selectedIncident && (
                <div className="selected-incident-info">
                  <h3>Incident Details</h3>
                  <p><strong>Type:</strong> {selectedIncident.type}</p>
                  <p><strong>Location:</strong> {selectedIncident.latitude?.toFixed(4)}, {selectedIncident.longtitude?.toFixed(4)}</p>
                  <p><strong>Priority:</strong> {selectedIncident.severityLevel}</p>
                  <p><strong>{getNeedsLabel(selectedIncident.type)}</strong> {selectedIncident.needs || 0}</p>
                </div>
              )}
              <div className="modal-body-content">
                {emergencyUnits.length === 0 ? (
                  <div className="no-units">
                    <p>No available units found for this incident type</p>
                  </div>
                ) : (
                  <>
                    <div className="units-grid">
                      {emergencyUnits.map((unit) => {
                        const isUnavailable = unit.status === true || unit.status === 'BUSY' || unit.status === 'OFFLINE';
                        return (
                          <div
                            key={unit.unitID || unit.id}
                            className={`unit-card-wrapper ${
                              selectedUnits.includes(unit.unitID || unit.id) ? 'selected' : ''
                            } ${isUnavailable ? 'disabled' : ''}`}
                            onClick={() => handleToggleUnitSelection(unit)}
                          >
                            <EmergencyUnitCard
                              key={unit.unitID || unit.id}
                              unit={unit}
                              incident={selectedIncident}
                              onAssign={handleAssignUnit}
                              showAssignButton={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="modal-footer">
                      <button
                        className="dispatch-selected-btn"
                        onClick={handleAssignSelectedUnits}
                        disabled={selectedUnits.length === 0}
                      >
                        Dispatch {selectedUnits.length} Selected Unit{selectedUnits.length !== 1 ? 's' : ''}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {showUserManagementModal && (
        <div className="modal-overlay" onClick={closeUserManagementModal}>
          <div className="modal-content user-management-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👥 User Management</h2>
              <button className="close-button" onClick={closeUserManagementModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="create-user-form">
                <h3>Create New User</h3>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="DISPATCHER">Dispatcher</option>
                    <option value="FIELD_AGENT">Field Agent</option>
                    <option value="USER">User</option>
                  </select>
                  <button onClick={handleCreateUser} className="create-user-btn">
                    Create User
                  </button>
                </div>
              </div>

              <div className="users-list">
                <h3>Existing Users</h3>
                {loadingUsers ? (
                  <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <p>No users found</p>
                ) : (
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`role-badge ${user.role?.toLowerCase()}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="delete-user-btn"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;