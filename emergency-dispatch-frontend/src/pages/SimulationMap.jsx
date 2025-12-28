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
          const color = getColorForType(updated.type);
          const severity = (updated.severityLevel || '').toString().toUpperCase();
          const radius = severity === 'CRITICAL' ? 14 : (severity === 'MEDIUM' ? 10 : 6);
          if (marker && marker.setLatLng) {
            marker.setLatLng([updated.latitude, updated.longtitude]);
            if (marker.setStyle) marker.setStyle({ radius, fillColor: color, color: '#333', weight: 1, fillOpacity: 0.9 });
            marker.bindPopup(`<strong>Incident #${updated.incidentId}</strong><br/>Type: ${updated.type}<br/>Severity: ${updated.severityLevel}`);
          } else {
            addOrUpdateIncident(updated);
          }
        }).catch(e => console.error('Failed to move incident to Las Vegas', e));
    }; 
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    websocketService.on('unitsList', handleUnitsList);
    websocketService.on('unitUpdate', handleUnitUpdate);
    websocketService.on('unitLocation', handleUnitLocation);
    websocketService.on('incidentAdded', handleIncident);
    websocketService.on('incidentUpdate', handleIncidentUpdate);
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
      websocketService.off('unitsList', handleUnitsList);
      websocketService.off('unitUpdate', handleUnitUpdate);
      websocketService.off('unitLocation', handleUnitLocation);
      websocketService.off('incidentAdded', handleIncident);
      websocketService.off('incidentUpdate', handleIncidentUpdate);
      websocketService.off('connected', handleConnect);
      websocketService.off('disconnected', handleDisconnect);
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  // Sync map control input value with React state
  useEffect(() => {
    const input = document.getElementById('mapUnitCount');
    if (input) input.value = unitCount;
  }, [unitCount]);

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
      marker.bindPopup(popup);
    } else {
      // Create a marker with a car icon instead of a circle
      const marker = L.marker([lat, lon], { icon: createCarIcon(unit.type) }).addTo(mapRef.current);
      marker.bindPopup(popup);
      markersRef.current.units.set(id, marker);
    }
  }

  function addOrUpdateIncident(inc) {
    if (!inc || inc.incidentId == null) return;
    const id = inc.incidentId;
    const lat = parseFloat(inc.latitude);
    const lon = parseFloat(inc.longtitude || inc.longitude || 0);
    if (!isFinite(lat) || !isFinite(lon)) return;

    const color = getColorForType(inc.type);
    const severity = (inc.severityLevel || '').toString().toUpperCase();
    const radius = severity === 'CRITICAL' ? 14 : (severity === 'MEDIUM' ? 10 : 6);

    // If the incident has an active assignment, style it slightly dimmer and show assigned count
    const hasActive = Boolean(inc.hasActiveAssignments || inc.hasAssignments || (inc.assignedUnitsCount && inc.assignedUnitsCount > 0));
    const fillOpacity = hasActive ? 0.55 : 0.9;
    const strokeColor = hasActive ? '#000' : '#333';

    const assignmentText = hasActive ? `<br/><em>Assigned: ${inc.assignedUnitsCount ?? (inc.totalAssignmentsCount ?? 1)}</em>` : '';
    const popup = `<strong>Incident #${id}</strong><br/>Type: ${inc.type}<br/>Severity: ${inc.severityLevel || ''}${assignmentText}`;

    if (markersRef.current.incidents.has(id)) {
      const marker = markersRef.current.incidents.get(id);
      if (marker.setLatLng) marker.setLatLng([lat, lon]);
      if (marker.setStyle) marker.setStyle({ radius, fillColor: color, color: strokeColor, weight: 1, fillOpacity });
      marker.bindPopup(popup);
    } else {
      const marker = L.circleMarker([lat, lon], { radius, fillColor: color, color: strokeColor, weight: 1, fillOpacity }).addTo(mapRef.current);
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

  // Create a small SVG car icon filled with the unit color
  function createCarIcon(type) {
    const color = getColorForType(type);
    const svg = `
      <svg width="28" height="18" viewBox="0 0 28 18" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="4" width="28" height="10" rx="2" ry="2" fill="${color}" />
        <circle cx="7" cy="14" r="2" fill="#111" />
        <circle cx="21" cy="14" r="2" fill="#111" />
        <rect x="4" y="6" width="20" height="6" rx="1" fill="#ffffff33" />
      </svg>`;
    return L.divIcon({ html: svg, className: 'unit-car-icon', iconSize: [28, 18], iconAnchor: [14, 9] });
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
      .then(r => r.text()).then(t => alert(t)).catch(e => alert('Error: ' + e));
  }
  function stopSimulation() {
    fetch(`${API_BASE}/api/simulation/stop`, { method: 'POST' })
      .then(r => r.text()).then(t => alert(t)).catch(e => alert('Error: ' + e));
  }

  return (
    <div style={{height: '100%'}}>
      <div style={{display:'flex',padding:12,alignItems:'center',gap:12,background:'#f7f7f7'}}>
        <button onClick={startSimulation} style={{padding:8,background:'#007bff',color:'#fff',borderRadius:6}}>Start Simulation</button>
        <button onClick={stopSimulation} style={{padding:8,background:'#dc3545',color:'#fff',borderRadius:6}}>Stop Simulation</button>
        <div style={{marginLeft:'auto',fontWeight:700}}>WS: {connected ? 'Connected' : 'Disconnected'}</div>
      </div>
      <div id="simulation-map-root" style={{height:'calc(100vh - 64px)'}}></div>
    </div>
  );
}
