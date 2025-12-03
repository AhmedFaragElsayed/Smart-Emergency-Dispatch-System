import React, { useState, useEffect } from 'react';
import IncidentCard from '../components/IncidentCard';
import EmergencyUnitCard from '../components/EmergencyUnitCard';
import websocketService from '../services/websocketService';
import apiService from '../services/apiService';
import '../styles/AdminPortal.css';

const AdminPortal = () => {
  const [incidents, setIncidents] = useState([]);
  const [emergencyUnits, setEmergencyUnits] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {

    loadIncidentsViaAPI();

    connectWebSocket();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  const connectWebSocket = async () => {
    try {
      await websocketService.connect('http://localhost:9696/ws');
      setIsConnected(true);
      
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

  const handleDispatch = async (incident) => {
    console.log('Dispatching incident:', incident);
    setSelectedIncident(incident);

    try {
      const units = await apiService.fetchEmergencyUnits(incident.type);
      console.log('Loaded emergency units:', units);
      setEmergencyUnits(units);
      setShowUnitsModal(true);
    } catch (error) {
      console.error('Error fetching emergency units:', error);
      alert('Failed to fetch emergency units');
    }
  };

  const handleAssignUnit = async (unit, incident) => {
    console.log('Assigning unit:', unit, 'to incident:', incident);

    try {
      await apiService.assignUnit(unit.unitID || unit.id, incident.incidentId || incident.id);
      setShowUnitsModal(false);
      setSelectedIncident(null);
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
    setEmergencyUnits([]);
  };

  const filteredIncidents = incidents.filter((incident) => {
    const statusMatch = filterStatus === 'ALL' || incident.status === filterStatus;
    const typeMatch = filterType === 'ALL' || incident.type?.toLowerCase() === filterType.toLowerCase();
    return statusMatch && typeMatch;
  });

  return (
    <div className="admin-portal">
      <header className="admin-header">
        <h1>🚨 Emergency Dispatch Admin Portal</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <div className="filters-section">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="COMPLETED">Completed</option>
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
                  <p><strong>Location:</strong> {selectedIncident.location}</p>
                  <p><strong>Priority:</strong> {selectedIncident.priority}</p>
                </div>
              )}
              {emergencyUnits.length === 0 ? (
                <div className="no-units">
                  <p>No available units found for this incident type</p>
                </div>
              ) : (
                <div className="units-grid">
                  {emergencyUnits.map((unit) => (
                    <EmergencyUnitCard
                      key={unit.unitID || unit.id}
                      unit={unit}
                      incident={selectedIncident}
                      onAssign={handleAssignUnit}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
