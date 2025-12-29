import React, { useEffect, useRef, useState } from 'react';
import websocketService from '../services/websocketService';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// Fix default marker icons when using bundlers (Vite/webpack)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Local styles for improved icons
import '../styles/SimulationMap.css';

const API_BASE = 'http://localhost:9696';

// Las Vegas bounds (approx)
const LAS_VEGAS_BOUNDS = {
  minLat: 36.04,
  maxLat: 36.27,
  minLng: -115.29,
  maxLng: -115.04
};
function randomLasVegas() {
  const lat = LAS_VEGAS_BOUNDS.minLat + Math.random() * (LAS_VEGAS_BOUNDS.maxLat - LAS_VEGAS_BOUNDS.minLat);
  const lng = LAS_VEGAS_BOUNDS.minLng + Math.random() * (LAS_VEGAS_BOUNDS.maxLng - LAS_VEGAS_BOUNDS.minLng);
  return { lat, lng };
}

export default function SimulationMap() {
  const mapRef = useRef(null);
  const markersRef = useRef({ units: new Map(), incidents: new Map() });
  const [connected, setConnected] = useState(websocketService.isConnected());
  const [unitCount, setUnitCount] = useState(3);
  // Track whether the simulation appears to be running. We set this when start/stop are clicked
  // and also auto-detect activity (assignments/units updates) to keep in sync when others control the sim.
  const [simulationRunning, setSimulationRunning] = useState(false);
  const lastSimActivityRef = useRef(null);
  const simActivityTimerRef = useRef(null);

  useEffect(() => {
    // Initialize map (center Manhattan)
    mapRef.current = L.map('simulation-map-root').setView([40.7831, -73.9712], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);

    // Constrain map to Las Vegas bounds and prevent zooming out beyond the area
    const lvBounds = L.latLngBounds([
      [LAS_VEGAS_BOUNDS.minLat, LAS_VEGAS_BOUNDS.minLng],
      [LAS_VEGAS_BOUNDS.maxLat, LAS_VEGAS_BOUNDS.maxLng]
    ]);
    // Add a small padding so controls and markers near the edge are visible
    const paddedBounds = lvBounds.pad(0.12);
    // Fit the view and lock panning to the padded bounds
    mapRef.current.fitBounds(lvBounds);
    mapRef.current.setMaxBounds(paddedBounds);

    // Prevent zooming out beyond the bounds: set minZoom to the zoom that fits the padded bounds
    const minAllowedZoom = mapRef.current.getBoundsZoom(paddedBounds, false);
    mapRef.current.setMinZoom(minAllowedZoom);

    // Allow zoom interactions (scroll / double click) but don't let zoom go below minAllowedZoom
    mapRef.current.scrollWheelZoom.enable();
    mapRef.current.doubleClickZoom.enable();

    // Ensure panning remains constrained and enforce min zoom if user tries to bypass
    mapRef.current.options.maxBoundsViscosity = 1.0;
    mapRef.current.on('zoomend', () => {
      if (mapRef.current.getZoom() < minAllowedZoom) {
        mapRef.current.setZoom(minAllowedZoom);
      }
    });

    // Keep map controls but prevent users from zooming out past the min zoom

    // Add generate control on map (count + generate button)
    const GenerateControl = L.Control.extend({
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
        container.style.background = 'white';
        container.style.padding = '6px';
        container.style.borderRadius = '4px';
        container.style.minWidth = '200px';
        container.innerHTML = `<input type="number" id="mapUnitCount" min="1" value="${unitCount}" style="width:72px;margin-right:8px;background:white;color:#000;border:1px solid #ccc;padding:4px;border-radius:4px;" />
            <button id="mapGenerateBtn" style="padding:6px 8px;background:#007bff;color:white;border:none;border-radius:4px;">Generate</button>`;
        L.DomEvent.disableClickPropagation(container);
        return container;
      }
    });
    mapRef.current.addControl(new GenerateControl({ position: 'topright' }));

    // Attach click handler that reads the input and triggers generation
    setTimeout(() => {
      const btn = document.getElementById('mapGenerateBtn');
      const input = document.getElementById('mapUnitCount');
      if (btn) {
        // use onclick to avoid adding multiple listeners
        btn.onclick = () => {
          const val = input ? parseInt(input.value, 10) || 0 : unitCount;
          generateUnits(val);
        };
      }
      // keep React state in sync when map input changes
      if (input) {
        input.oninput = (e) => {
          const v = parseInt(e.target.value || '0', 10) || 0;
          setUnitCount(v);
        };
      }
    }, 0);

    // Connect websocket if not already
    if (!websocketService.isConnected()) {
      websocketService.connect().catch(err => console.error('WS connect failed', err));
    }

    // Handlers
    const handleUnitsList = (units) => {
      // clear existing unit markers
      markersRef.current.units.forEach(m => mapRef.current.removeLayer(m));
      markersRef.current.units.clear();
      units.forEach(addOrUpdateUnit);
    };

    const handleUnitUpdate = (unit) => addOrUpdateUnit(unit);
    const handleUnitLocation = (update) => {
      addOrUpdateUnit({ unitID: update.unitId, latitude: update.latitude, longtitude: update.longtitude, type: update.type, status: update.status });
    };
    const handleIncident = (inc) => {
      // add immediately as a colored dot
      addOrUpdateIncident(inc);
      // then move it to Las Vegas by updating backend and updating marker style/position
      const coords = randomLasVegas();
      fetch(`${API_BASE}/api/incidents/${inc.incidentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: coords.lat, longtitude: coords.lng })
      }).then(r => r.json())
        .then(updated => {
          // update marker position and style if exists
          const marker = markersRef.current.incidents.get(updated.incidentId);
          const severity = (updated.severityLevel || '').toString().toUpperCase();
          if (marker && marker.setLatLng) {
            marker.setLatLng([updated.latitude, updated.longtitude]);
            const hasActiveUpdated = Boolean(updated.hasActiveAssignments || updated.hasAssignments || (updated.assignedUnitsCount && updated.assignedUnitsCount > 0));
            const statusUpdated = (updated.status || '').toString().toUpperCase() || 'PENDING';
            if (marker.setIcon) marker.setIcon(createIncidentIcon(updated.type, severity, hasActiveUpdated, statusUpdated));
            marker.bindPopup(`<strong>Incident #${updated.incidentId}</strong><br/>Type: ${updated.type}<br/>Severity: ${updated.severityLevel}<br/>Status: ${statusUpdated}`);
          } else {
            addOrUpdateIncident(updated);
          }
        }).catch(e => console.error('Failed to move incident to Las Vegas', e));
    };

    // Handle assignment updates (single assignment or list of assignments)
    const processAssignment = (assignment) => {
      if (!assignment) return;
      try {
        // If the assignment includes the emergencyUnit object, update that unit immediately
        if (assignment.emergencyUnit) {
          addOrUpdateUnit({
            unitID: assignment.emergencyUnit.unitID || assignment.emergencyUnit.unitId || assignment.emergencyUnit.unitID,
            latitude: assignment.emergencyUnit.latitude,
            longtitude: assignment.emergencyUnit.longtitude,
            type: assignment.emergencyUnit.type,
            status: assignment.emergencyUnit.status
          });
        } else if (assignment.unitId || assignment.emergencyUnitId) {
          // fetch updated unit details if only ID provided
          const uid = assignment.unitId || assignment.emergencyUnitId;
          fetch(`${API_BASE}/api/emergency-units/${uid}`).then(r => r.json()).then(u => addOrUpdateUnit(u)).catch(e => console.warn('Failed to fetch unit for assignment update', e));
        }

        // If the assignment includes incident details, update the incident marker
        if (assignment.incident) {
          const inc = {
            incidentId: assignment.incident.incidentId || assignment.incident.incidentId || assignment.incident.id,
            type: assignment.incident.type,
            latitude: assignment.incident.latitude,
            longtitude: assignment.incident.longtitude || assignment.incident.longitude,
            severityLevel: assignment.incident.severityLevel || assignment.incident.severity,
            hasActiveAssignments: assignment.incident.hasActiveAssignments,
            hasAssignments: assignment.incident.hasAssignments,
            assignedUnitsCount: assignment.incident.assignedUnitsCount || assignment.incident.totalAssignmentsCount
          };
          addOrUpdateIncident(inc);
        } else if (assignment.incidentId) {
          // fetch incident details if only id provided
          fetch(`${API_BASE}/api/incidents/${assignment.incidentId}`).then(r => r.json()).then(i => addOrUpdateIncident(i)).catch(e => console.warn('Failed to fetch incident for assignment update', e));
        }
      } catch (e) {
        console.error('Error processing assignment update', e);
      }
    };

    const handleAssignmentUpdate = (assignment) => {
      if (Array.isArray(assignment)) {
        assignment.forEach(processAssignment);
      } else {
        processAssignment(assignment);
      }
    };

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const bumpSimActivity = () => { lastSimActivityRef.current = Date.now(); };

    // Wrap certain handlers to also mark simulation activity
    const handleUnitsListWithActivity = (units) => { bumpSimActivity(); handleUnitsList(units); };
    const handleAssignmentUpdateWithActivity = (a) => { bumpSimActivity(); handleAssignmentUpdate(a); };
    const handleAssignmentsListWithActivity = (list) => { bumpSimActivity(); handleAssignmentUpdate(list); };
    const handleIncidentsList = (list) => { bumpSimActivity(); if (Array.isArray(list)) list.forEach(addOrUpdateIncident); };

    websocketService.on('unitsList', handleUnitsListWithActivity);
    websocketService.on('unitUpdate', (u) => { bumpSimActivity(); handleUnitUpdate(u); });
    websocketService.on('unitLocation', (loc) => { bumpSimActivity(); handleUnitLocation(loc); });
    websocketService.on('incidentAdded', (inc) => { bumpSimActivity(); handleIncident(inc); });
    websocketService.on('incidentsList', handleIncidentsList);
    websocketService.on('incidentUpdate', (i) => { bumpSimActivity(); handleIncidentUpdate(i); });
    websocketService.on('assignmentUpdate', handleAssignmentUpdateWithActivity);
    websocketService.on('assignmentsList', handleAssignmentsListWithActivity);
    websocketService.on('connected', handleConnect);
    websocketService.on('disconnected', handleDisconnect);

    // Try to get initial units and incidents via HTTP (fallback)
    fetch(`${API_BASE}/api/emergency-units`).then(r => r.json()).then(units => {
      units.forEach(addOrUpdateUnit);
    }).catch(e => console.warn('Error fetching units', e));

    fetch(`${API_BASE}/api/incidents`).then(r => r.json()).then(incidents => {
      if (Array.isArray(incidents)) incidents.forEach(addOrUpdateIncident);
    }).catch(e => console.warn('Error fetching incidents', e));

    return () => {
      websocketService.off('unitsList', handleUnitsListWithActivity);
      websocketService.off('unitUpdate');
      websocketService.off('unitLocation');
      websocketService.off('incidentAdded');
      websocketService.off('incidentsList', handleIncidentsList);
      websocketService.off('incidentUpdate');
      websocketService.off('assignmentUpdate', handleAssignmentUpdateWithActivity);
      websocketService.off('assignmentsList', handleAssignmentsListWithActivity);
      websocketService.off('connected', handleConnect);
      websocketService.off('disconnected', handleDisconnect);
      if (simActivityTimerRef.current) { clearInterval(simActivityTimerRef.current); simActivityTimerRef.current = null; }
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  // Sync map control input value with React state
  useEffect(() => {
    const input = document.getElementById('mapUnitCount');
    if (input) input.value = unitCount;
  }, [unitCount]);

  // Monitor recent websocket activity to heuristically determine if the simulation is running
  useEffect(() => {
    // Check every 2 seconds; if we saw activity within the last 4 seconds assume simulation is active
    simActivityTimerRef.current = setInterval(() => {
      const last = lastSimActivityRef.current;
      if (last && (Date.now() - last) < 4000) {
        setSimulationRunning(true);
      } else {
        setSimulationRunning(false);
      }
    }, 2000);
    return () => { if (simActivityTimerRef.current) { clearInterval(simActivityTimerRef.current); simActivityTimerRef.current = null; } };
  }, []);

  function addOrUpdateUnit(unit) {
    if (!unit || unit.unitID == null) return;
    const id = unit.unitID;
    const lat = parseFloat(unit.latitude);
    const lon = parseFloat(unit.longtitude || unit.longitude || 0);
    if (!isFinite(lat) || !isFinite(lon)) return;

    const popup = `<strong>Unit #${id}</strong><br/>Type: ${unit.type}<br/>Status: ${unit.status ? 'Available' : 'Busy'}`;

    if (markersRef.current.units.has(id)) {
      const marker = markersRef.current.units.get(id);
      // Update position and icon to reflect type changes
      marker.setLatLng([lat, lon]);
      if (marker.setIcon) {
        marker.setIcon(createCarIcon(unit.type));
      } else {
        // fallback: remove and recreate marker
        mapRef.current.removeLayer(marker);
        const newMarker = L.marker([lat, lon], { icon: createCarIcon(unit.type) }).addTo(mapRef.current);
        newMarker.bindPopup(popup);
        markersRef.current.units.set(id, newMarker);
      }
      // Dim or highlight marker based on status (busy vs available)
      if (typeof marker.setOpacity === 'function') marker.setOpacity(unit.status ? 1.0 : 0.5);
      marker.bindPopup(popup);
    } else {
      // Create a marker with a car icon instead of a circle
      const marker = L.marker([lat, lon], { icon: createCarIcon(unit.type) }).addTo(mapRef.current);
      marker.bindPopup(popup);
      if (typeof marker.setOpacity === 'function') marker.setOpacity(unit.status ? 1.0 : 0.5);
      markersRef.current.units.set(id, marker);
    }
  }

  // Create an SVG 'pin' icon for incidents (size depends on severity and current incident status)
  function createIncidentIcon(type, severity, hasActive, status) {
    const color = getColorForType(type);
    const size = severity === 'CRITICAL' ? 44 : (severity === 'MEDIUM' ? 36 : 28);
    const innerColor = '#fff';
    const statusStr = (status || 'PENDING').toString().toUpperCase();
    // Completed incidents are dimmed; dispatched ones show an accent ring
    const opacity = (statusStr === 'COMPLETED') ? 0.6 : (hasActive ? 0.85 : 1.0);
    const strokeStyle = (statusStr === 'DISPATCH') ? 'stroke:#ff8c00;stroke-width:1.3' : 'stroke:#222;stroke-width:0.5';
    const showCheck = (statusStr === 'COMPLETED');
    const dispatchRing = (statusStr === 'DISPATCH') ? `<circle cx="12" cy="9.5" r="6.8" fill="none" stroke="#ff8c00" stroke-width="1" opacity="0.95" />` : '';
    const pulseClass = (statusStr === 'COMPLETED') ? '' : 'pulse';
    const checkSvg = showCheck ? '<path d="M9 11l2 2 4-4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' : '';
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g class="pin-shadow">
          <path class="${pulseClass}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 11 7 11s7-5.75 7-11c0-3.87-3.13-7-7-7z" fill="${color}" fill-opacity="${opacity}" />
        </g>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 11 7 11s7-5.75 7-11c0-3.87-3.13-7-7-7z" fill="${color}" style="${strokeStyle}" />
        ${dispatchRing}
        <circle cx="12" cy="9.5" r="3.1" fill="${innerColor}" />
        ${checkSvg}
      </svg>`;
    const className = 'incident-pin-icon incident-status-' + statusStr.toLowerCase();
    return L.divIcon({ html: svg, className, iconSize: [size, size], iconAnchor: [Math.floor(size/2), size], popupAnchor: [0, -Math.floor(size/2)] });
  }

  function addOrUpdateIncident(inc) {
    if (!inc || inc.incidentId == null) return;
    const id = inc.incidentId;
    const lat = parseFloat(inc.latitude);
    const lon = parseFloat(inc.longtitude || inc.longitude || 0);
    if (!isFinite(lat) || !isFinite(lon)) return;

    const severity = (inc.severityLevel || '').toString().toUpperCase();
    const status = (inc.status || '').toString().toUpperCase() || 'PENDING';

    // If the incident has an active assignment, style it slightly dimmer and show assigned count
    const hasActive = Boolean(inc.hasActiveAssignments || inc.hasAssignments || (inc.assignedUnitsCount && inc.assignedUnitsCount > 0));

    const assignmentText = hasActive ? `<br/><em>Assigned: ${inc.assignedUnitsCount ?? (inc.totalAssignmentsCount ?? 1)}</em>` : '';
    const popup = `<strong>Incident #${id}</strong><br/>Type: ${inc.type}<br/>Severity: ${inc.severityLevel || ''}${assignmentText}<br/>Status: ${status}`;

    if (markersRef.current.incidents.has(id)) {
      const marker = markersRef.current.incidents.get(id);
      if (marker.setLatLng) marker.setLatLng([lat, lon]);
      if (marker.setIcon) marker.setIcon(createIncidentIcon(inc.type, severity, hasActive, status));
      else {
        // fallback for older circle markers: remove and recreate as marker
        mapRef.current.removeLayer(marker);
        const newMarker = L.marker([lat, lon], { icon: createIncidentIcon(inc.type, severity, hasActive, status) }).addTo(mapRef.current);
        newMarker.bindPopup(popup);
        markersRef.current.incidents.set(id, newMarker);
      }
      // re-bind popup to whichever marker is current
      const currentMarker = markersRef.current.incidents.get(id);
      if (currentMarker && currentMarker.bindPopup) currentMarker.bindPopup(popup);
    } else {
      const marker = L.marker([lat, lon], { icon: createIncidentIcon(inc.type, severity, hasActive, status) }).addTo(mapRef.current);
      marker.bindPopup(popup);
      markersRef.current.incidents.set(id, marker);
    }
  }

  // Handle monitor updates (including deletions and assignment changes)
  function handleIncidentUpdate(data) {
    if (!data) return;
    if (data.action === 'deleted' && data.incidentId) {
      const id = data.incidentId;
      const marker = markersRef.current.incidents.get(id);
      if (marker) {
        mapRef.current.removeLayer(marker);
        markersRef.current.incidents.delete(id);
      }
      return;
    }
    // data may be the map produced by IncidentMonitorService
    // normalize fields to match addOrUpdateIncident expectations
    const inc = {
      incidentId: data.incidentId || data.incident_id || data.id,
      type: data.type,
      latitude: data.latitude,
      longtitude: data.longtitude || data.longitude,
      severityLevel: data.severityLevel || data.severity || data.severity_level,
      status: data.status,
      hasActiveAssignments: data.hasActiveAssignments,
      hasAssignments: data.hasAssignments,
      assignedUnitsCount: data.assignedUnitsCount || data.totalAssignmentsCount
    };
    addOrUpdateIncident(inc);
  }

  function getColorForType(type) {
    switch ((type || '').toString().toUpperCase()) {
      case 'FIRE': return 'red';
      case 'POLICE': return 'blue';
      case 'AMBULANCE': return 'green';
      default: return 'gray';
    }
  }

  // Create a richer SVG car icon filled with the unit color (better shape, wheels, headlights)
  function createCarIcon(type) {
    const color = getColorForType(type);
    const svg = `
      <svg width="36" height="20" viewBox="0 0 36 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g>
          <rect class="body" x="1" y="4" width="34" height="10" rx="3" ry="3" fill="${color}"/>
          <rect x="6" y="6" width="10" height="6" rx="1" fill="#ffffff55"/>
          <rect x="20" y="6" width="8" height="6" rx="1" fill="#ffffff33"/>
          <ellipse cx="9" cy="16" rx="3" ry="2.2" fill="#111"/>
          <ellipse cx="27" cy="16" rx="3" ry="2.2" fill="#111"/>
          <rect x="1" y="4" width="34" height="10" rx="3" fill-opacity="0" stroke="#111" stroke-width="0.8"/>
          <rect x="30" y="7" width="3" height="2" rx="0.8" fill="#fff9" />
        </g>
      </svg>`;
    return L.divIcon({ html: svg, className: 'unit-car-icon', iconSize: [36, 20], iconAnchor: [18, 10], popupAnchor: [0, -10] });
  }

  async function generateUnits(countParam) {
    const count = (typeof countParam !== 'undefined') ? countParam : unitCount;
    if (!count || count < 1) return alert('Enter a valid number');

    // disable map button to prevent duplicate clicks
    const btn = document.getElementById('mapGenerateBtn');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/api/emergency-units/generator/generate-random?count=${count}`, { method: 'POST' });
      const created = await res.json();
      console.log('Created units:', created);

      if (Array.isArray(created)) {
        created.forEach(addOrUpdateUnit);
        // Move each created unit to a random spot in Manhattan
        websocketService.connect().then(() => {
          created.forEach(u => {
            const coords = randomLasVegas();
            websocketService.send('/app/unit.updateLocation', { unitId: u.unitID, latitude: coords.lat, longitude: coords.lng });
          });
        }).catch(() => {
          // fallback: full PUT update (include required fields to avoid nulling)
          created.forEach(u => {
            const coords = randomLasVegas();
            fetch(`${API_BASE}/api/emergency-units/${u.unitID}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude: coords.lat, longtitude: coords.lng, type: u.type, capacity: u.capacity, status: u.status })
            }).then(r => r.json()).then(updated => addOrUpdateUnit(updated)).catch(e => console.error('Unit update fallback failed', e));
          });
        });
        alert(`Created ${created.length} unit(s)`);
      } else {
        alert('Unexpected response from server');
      }
    } catch (e) {
      alert('Error generating units: ' + e);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function startSimulation() {
    fetch(`${API_BASE}/api/simulation/start`, { method: 'POST' })
      .then(r => r.text())
      .then(t => {
        alert(t);
        setSimulationRunning(true);
        lastSimActivityRef.current = Date.now();
      })
      .catch(e => alert('Error: ' + e));
  }
  function stopSimulation() {
    fetch(`${API_BASE}/api/simulation/stop`, { method: 'POST' })
      .then(r => r.text())
      .then(t => {
        alert(t);
        setSimulationRunning(false);
        lastSimActivityRef.current = null;
      })
      .catch(e => alert('Error: ' + e));
  }

  return (
    <div style={{height: '100%'}}>
      <div style={{display:'flex',padding:12,alignItems:'center',gap:12,background:'#f7f7f7'}}>
        <button onClick={startSimulation} disabled={simulationRunning} style={{padding:8,background:simulationRunning ? '#6c757d' : '#007bff',color:'#fff',borderRadius:6}}>Start Simulation</button>
        <button onClick={stopSimulation} disabled={!simulationRunning} style={{padding:8,background:!simulationRunning ? '#6c757d' : '#dc3545',color:'#fff',borderRadius:6}}>Stop Simulation</button>
        <div style={{marginLeft:12,display:'flex',alignItems:'center',gap:10}}>
          <div className={`sim-badge ${simulationRunning ? 'running' : 'stopped'}`} title={`Simulation ${simulationRunning ? 'running' : 'stopped'}`}>
            <span className="sim-dot" aria-hidden></span>
            <span className="sim-text">Simulation: {simulationRunning ? 'Running' : 'Stopped'}</span>
          </div>
        </div>
        <div style={{marginLeft:'auto',fontWeight:700}}>WS: {connected ? 'Connected' : 'Disconnected'}</div>
      </div>
      <div id="simulation-map-root" style={{height:'calc(100vh - 64px)'}}></div>
    </div>
  );
}
