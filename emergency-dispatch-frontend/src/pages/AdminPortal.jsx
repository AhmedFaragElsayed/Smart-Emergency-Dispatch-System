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
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterSeverityLevel, setFilterSeverityLevel] = useState('ALL');

  useEffect(() => {
    loadIncidentsViaAPI();
    setupWebSocketListeners();

    return () => {
      // Clean up listeners but don't disconnect (managed by App.jsx)
      websocketService.off('incidentUpdate');
      websocketService.off('unitUpdate');
      websocketService.off('assignmentUpdate');
      websocketService.off('notification');
    };
  }, []);

  const setupWebSocketListeners = () => {
    // WebSocket is already connected via App.jsx
    setIsConnected(websocketService.isConnected());
    
    websocketService.on('incidentUpdate', (incident) => {
        console.log('Received incident update via WebSocket:', incident);
        // Update incidents state directly for instant updates
        setIncidents((prevIncidents) => {
          const existingIndex = prevIncidents.findIndex(
            (i) => i.incidentId === incident.incidentId
          );
          if (existingIndex >= 0) {
            // Update existing incident
            const updated = [...prevIncidents];
            updated[existingIndex] = incident;
            return updated;
          } else {
            // Add new incident at the beginning
            return [incident, ...prevIncidents];
          }
        });
      });

      websocketService.on('unitUpdate', (unit) => {
        console.log('Received unit update via WebSocket:', unit);
        // Update the emergency units list if it's being displayed
        setEmergencyUnits((prevUnits) => {
          const existingIndex = prevUnits.findIndex((u) => u.unitID === unit.unitID);
          if (existingIndex >= 0) {
            // Update existing unit
            const updated = [...prevUnits];
            updated[existingIndex] = unit;
            return updated;
          } else {
            // Add new unit if it matches the current filter
            return [...prevUnits, unit];
          }
        });
      });

      websocketService.on('assignmentUpdate', (assignment) => {
        console.log('Received assignment update via WebSocket:', assignment);
        // Refresh incidents list when assignment is created/updated
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
    // Don't allow selecting unavailable units
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
      // Assign all selected units using the current logged-in user's ID
      const assignmentPromises = selectedUnits.map((unitId) =>
        apiService.assignUnit(unitId, selectedIncident.incidentId || selectedIncident.id, user.id)
      );

      await Promise.all(assignmentPromises);
      
      setShowUnitsModal(false);
      setSelectedIncident(null);
      setSelectedUnits([]);
      setEmergencyUnits([]);
      
      // Refresh incidents
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
      // Refresh incidents
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

  const getNeedsLabel = (type) => {
    const typeStr = type?.toLowerCase() || '';
    if (typeStr.includes('fire')) return 'Damaged Buildings:';
    if (typeStr.includes('medical')) return 'Injured People:';
    if (typeStr.includes('police')) return 'Criminals:';
    return 'Needs:';
  };

  const filteredIncidents = incidents.filter((incident) => {
    // Treat null/undefined status as "PENDING"
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
            className="back-button" 
            onClick={() => { logout(); navigate('/signin'); }}
            style={{ background: '#e74c3c' }}
          >
            Logout
          </button>
        </div>
      </header>

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
          <label>Severity Level </label>
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
    </div>
  );
};

export default AdminPortal;
