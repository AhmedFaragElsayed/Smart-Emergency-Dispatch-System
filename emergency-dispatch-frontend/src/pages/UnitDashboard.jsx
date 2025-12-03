import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import '../styles/UnitDashboard.css';

const UnitDashboard = () => {
  const [units, setUnits] = useState([]);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({
    type: 'Ambulance',
    capacity: 1,
    latitude: 0,
    longtitude: 0,
    status: true
  });
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => { loadUnits(); }, []);

  const loadUnits = async () => {
    try {
      const data = await apiService.fetchEmergencyUnits('');
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
      alert('Failed to load units');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        await apiService.updateUnit(editingUnit.unitID, formData);
      } else {
        await apiService.createUnit(formData);
      }
      resetForm();
      loadUnits();
    } catch (error) {
      console.error('Error saving unit:', error);
      alert('Failed to save unit');
    }
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setFormData({
      type: unit.type,
      capacity: unit.capacity,
      latitude: unit.latitude,
      longtitude: unit.longtitude,
      status: unit.status
    });
    setIsFormVisible(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this unit?')) {
      try {
        await apiService.deleteUnit(id);
        loadUnits();
      } catch (error) {
        console.error('Error deleting unit:', error);
        alert('Failed to delete unit');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'Ambulance',
      capacity: 1,
      latitude: 0,
      longtitude: 0,
      status: true
    });
    setEditingUnit(null);
    setIsFormVisible(false);
  };

  const unitTypes = ['Ambulance', 'Fire Truck', 'Police Car', 'Rescue Vehicle'];

  return (
    <div className="unit-dashboard">
      <div className="dashboard-header">
        <h1>🚑 Emergency Unit Management</h1>
        <button 
          className="btn-primary" 
          onClick={() => setIsFormVisible(!isFormVisible)}
        >
          {isFormVisible ? '✖ Cancel' : '➕ Add New Unit'}
        </button>
      </div>

      {isFormVisible && (
        <div className="unit-form-container">
          <h2>{editingUnit ? '✏️ Edit Unit' : '➕ Add New Unit'}</h2>
          <form onSubmit={handleSubmit} className="unit-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type">Unit Type *</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                >
                  {unitTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="capacity">Capacity *</label>
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="latitude">Latitude *</label>
                <input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="longtitude">Longitude *</label>
                <input
                  id="longtitude"
                  type="number"
                  step="0.000001"
                  value={formData.longtitude}
                  onChange={(e) => setFormData({...formData, longtitude: parseFloat(e.target.value)})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.checked})}
                />
                <span>Available</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingUnit ? '💾 Update Unit' : '➕ Add Unit'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="units-container">
        <h2>All Emergency Units ({units.length})</h2>
        {units.length === 0 ? (
          <div className="no-units">
            <p>No emergency units available. Add one to get started!</p>
          </div>
        ) : (
          <div className="units-grid">
            {units.map(unit => (
              <div key={unit.unitID} className={`unit-card ${unit.status ? 'available' : 'unavailable'}`}>
                <div className="unit-header">
                  <div className="unit-id">#{unit.unitID}</div>
                  <div className={`unit-status ${unit.status ? 'status-available' : 'status-unavailable'}`}>
                    {unit.status ? '✓ Available' : '✖ Unavailable'}
                  </div>
                </div>
                
                <div className="unit-body">
                  <div className="unit-icon">
                    {unit.type === 'Ambulance' && '🚑'}
                    {unit.type === 'Fire Truck' && '🚒'}
                    {unit.type === 'Police Car' && '🚓'}
                    {unit.type === 'Rescue Vehicle' && '🚐'}
                  </div>
                  <h3>{unit.type}</h3>
                  
                  <div className="unit-details">
                    <div className="detail-item">
                      <span className="detail-label">Capacity:</span>
                      <span className="detail-value">{unit.capacity} people</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">
                        {unit.latitude.toFixed(6)}, {unit.longtitude.toFixed(6)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="unit-actions">
                  <button 
                    className="btn-edit" 
                    onClick={() => handleEdit(unit)}
                    title="Edit unit"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="btn-delete" 
                    onClick={() => handleDelete(unit.unitID)}
                    title="Delete unit"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitDashboard;