import React from 'react';
import PropTypes from 'prop-types';
import '../styles/EmergencyUnitCard.css';

const EmergencyUnitCard = ({ unit, onAssign, incident }) => {
  const handleAssign = () => {
    onAssign(unit, incident);
  };

  const getUnitTypeIcon = (type) => {
    const icons = {
      medical: '🏥',
      police: '🚔',
      fire: '🚒',
    };
    return icons[type?.toLowerCase()] || '🚨';
  };

  const getUnitTypeColor = (type) => {
    const colors = {
      medical: '#5ed21bff',
      police: '#3498db',
      fire: '#a71201ff',
    };
    return colors[type?.toLowerCase()] || '#95a5a6';
  };

  const getStatusText = (status) => {
    if (typeof status === 'boolean') {
      return status ? 'AVAILABLE' : 'UNAVAILABLE';
    }
    return status?.toUpperCase() || 'UNKNOWN';
  };

  const getStatusClass = (status) => {
    if (typeof status === 'boolean') {
      return status ? 'available' : 'unavailable';
    }
    return status?.toLowerCase() || 'unknown';
  };

  return (
    <div className="emergency-unit-card">
      <div 
        className="unit-card-header" 
        style={{ backgroundColor: getUnitTypeColor(unit.type) }}
      >
        <div className="unit-icon">{getUnitTypeIcon(unit.type)}</div>
        <div className="unit-header-info">
          <h3>{unit.name || `Unit ${unit.unitID || unit.id}`}</h3>
          <span className={`availability-badge ${getStatusClass(unit.status)}`}>
            {getStatusText(unit.status)}
          </span>
        </div>
      </div>
      
      <div className="unit-card-body">
        <div className="unit-info">
          <div className="info-row">
            <span className="label">Unit ID:</span>
            <span className="value">{unit.unitID || unit.id}</span>
          </div>
          
          <div className="info-row">
            <span className="label">Type:</span>
            <span className="value">{unit.type}</span>
          </div>
          
          <div className="info-row">
            <span className="label">Capacity:</span>
            <span className="value">{unit.capacity} people</span>
          </div>
          
          <div className="info-row">
            <span className="label">Location:</span>
            <span className="value">
              {unit.latitude?.toFixed(4)}, {unit.longtitude?.toFixed(4)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="unit-card-footer">
        <button 
          className="assign-button" 
          onClick={handleAssign}
          disabled={unit.status === false || unit.status === 'BUSY' || unit.status === 'OFFLINE'}
        >
          Assign
        </button>
      </div>
    </div>
  );
};

EmergencyUnitCard.propTypes = {
  unit: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    unitID: PropTypes.number,
    name: PropTypes.string,
    type: PropTypes.string.isRequired,
    status: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    location: PropTypes.string,
    currentLocation: PropTypes.string,
    team: PropTypes.string,
    equipment: PropTypes.string,
    responseTime: PropTypes.number,
  }).isRequired,
  onAssign: PropTypes.func.isRequired,
  incident: PropTypes.object,
};

export default EmergencyUnitCard;
