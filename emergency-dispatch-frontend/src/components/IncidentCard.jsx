import React from 'react';
import PropTypes from 'prop-types';
import '../styles/IncidentCard.css';

const IncidentCard = ({ incident, onDispatch }) => {
  const handleDispatch = () => {
    onDispatch(incident);
  };

  const getIncidentTypeColor = (type) => {
    const colors = {
      medical: '#5ed21bff',
      police: '#3498db',
      fire: '#a71201ff',
    };
    return colors[type?.toLowerCase()] || '#95a5a6';
  };

  const formatDateTime = (dateArray) => {
    if (!dateArray) return 'N/A';
    // Backend sends LocalDateTime as array [year, month, day, hour, minute, second]
    if (Array.isArray(dateArray) && dateArray.length >= 6) {
      const [year, month, day, hour, minute] = dateArray;
      const date = new Date(year, month - 1, day, hour, minute);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    // Fallback for legacy LocalDate array [year, month, day]
    if (Array.isArray(dateArray) && dateArray.length >= 3) {
      const [year, month, day] = dateArray;
      return new Date(year, month - 1, day).toLocaleDateString();
    }
    // Fallback for string dates
    const date = new Date(dateArray);
    return date.toLocaleString();
  };

  const getNeedsLabel = (type) => {
    const typeStr = type?.toLowerCase() || '';
    if (typeStr.includes('fire')) return 'Damaged Buildings:';
    if (typeStr.includes('medical')) return 'Injured People:';
    if (typeStr.includes('police')) return 'Criminals:';
    return 'Needs:';
  };

  // Use backend field names
  const displayId = incident.incidentId || incident.id;
  const displayLocation = `${incident.latitude?.toFixed(4) || 'N/A'}, ${incident.longtitude?.toFixed(4) || 'N/A'}`;
  const displayStatus = incident.status || 'PENDING';
  const displayPriority = incident.severityLevel || 'Unknown';
  const displayTime = incident.reportedTime;

  return (
    <div className="incident-card">
      <div 
        className="incident-card-header" 
        style={{ backgroundColor: getIncidentTypeColor(incident.type) }}
      >
        <h3>{incident.type?.toUpperCase()}</h3>
        <span className={`status-badge ${displayStatus?.toLowerCase()}`}>
          {displayStatus}
        </span>
      </div>
      
      <div className="incident-card-body">
        <div className="incident-info">
          <div className="info-row">
            <span className="label">ID:</span>
            <span className="value">{displayId}</span>
          </div>
          
          <div className="info-row">
            <span className="label">Location:</span>
            <span className="value">{displayLocation}</span>
          </div>
          
          <div className="info-row">
            <span className="label">{getNeedsLabel(incident.type)}</span>
            <span className="value">{incident.needs || 0}</span>
          </div>
          
          <div className="info-row">
            <span className="label">Severity:</span>
            <span className={`value priority-${displayPriority?.toString().toLowerCase()}`}>
              Level {displayPriority}
            </span>
          </div>
          
          <div className="info-row">
            <span className="label">Reported:</span>
            <span className="value">{formatDateTime(displayTime)}</span>
          </div>
        </div>
      </div>
      
      <div className="incident-card-footer">
        <button 
          className="dispatch-button" 
          onClick={handleDispatch}
          disabled={displayStatus === 'DISPATCHED' || displayStatus === 'COMPLETED' || displayStatus === 'resolved'}
        >
          Dispatch
        </button>
      </div>
    </div>
  );
};

IncidentCard.propTypes = {
  incident: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    incidentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    type: PropTypes.string.isRequired,
    status: PropTypes.string,
    latitude: PropTypes.number,
    longitude: PropTypes.number,
    needs: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    severityLevel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    reportedTime: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  onDispatch: PropTypes.func.isRequired,
};

export default IncidentCard;
