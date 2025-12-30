import React, { useEffect, useRef, useState } from 'react';
import websocketService from '../services/websocketService';
import { useNavigate } from 'react-router-dom';
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
// Use the new Polling endpoint we created in the Controller
const POLLING_ENDPOINT = `${API_BASE}/api/monitor/unit-locations/poll`;
const REDIS_LOCATIONS_ENDPOINT = `${API_BASE}/api/monitor/unit-locations/redis`;

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
  const isGeneratingUnitsRef = useRef(false); // Suppress sim-activity during manual unit generation
  const generatedTargetsRef = useRef(new Map()); // Track desired locations for newly-generated units (to avoid visual jitter)
  const unitMetaRef = useRef(new Map()); // Cache unit type/status so Redis-only location batches can reuse metadata
  const initialLocationsLoadedRef = useRef(false);

  // Performance: disable smooth animations when processing very large batches
  const disableSmoothMovementRef = useRef(false);
  const MAX_ANIMATE_UNITS = 120; // If a location batch contains more than this many units, skip animations

  const [connected, setConnected] = useState(websocketService.isConnected());
  const [unitCount, setUnitCount] = useState(3);
  const navigate = useNavigate();
  // Track whether the simulation appears to be running. We set this when start/stop are clicked
  // and also auto-detect activity (assignments/units updates) to keep in sync when others control the sim.
  const [simulationRunning, setSimulationRunning] = useState(false);
  const lastSimActivityRef = useRef(null);
  const simActivityTimerRef = useRef(null);
  // If user explicitly started the simulation via the UI, keep indicator on until they stop it
  const explicitSimStartRef = useRef(false);

  // --- NEW: Ref for Polling Interval ---
  const pollIntervalRef = useRef(null);
  const POLLING_INTERVAL_MS = 1000; // Poll every 1 second

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
      if (!Array.isArray(units)) return;
      units.forEach(u => {
        const id = u.unitID ?? u.unitId ?? u.id;
        if (id == null) return;
        const meta = updateUnitMeta({ unitID: id, type: u.type, status: u.status });
        const marker = markersRef.current.units.get(id);
        // Update opacity to reflect availability without moving the marker
        if (marker && typeof meta?.resolvedStatus === 'boolean' && typeof marker.setOpacity === 'function') {
          marker.setOpacity(meta.resolvedStatus ? 1.0 : 0.5);
        }
      });
    };

    const handleUnitUpdate = (unit) => addOrUpdateUnit(unit);
    const handleIncident = (inc) => {
      // Place the incident directly at a Las Vegas coordinate to avoid visual flicker.
      const coords = randomLasVegas();
      // Add a preview of the incident locally at the target LV coordinates before persisting
      const previewInc = { ...inc, latitude: coords.lat, longtitude: coords.lng };
      addOrUpdateIncident(previewInc);

      // Persist the chosen LV coordinates to the backend. When the backend responds,
      // update style/popup and only move the marker if the backend returns a meaningfully
      // different location to prevent a visible jump.
      fetch(`${API_BASE}/api/incidents/${inc.incidentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: coords.lat, longtitude: coords.lng })
      }).then(r => r.json())
        .then(updated => {
          const marker = markersRef.current.incidents.get(updated.incidentId);
          const severity = (updated.severityLevel || '').toString().toUpperCase();
          const hasActiveUpdated = Boolean(updated.hasActiveAssignments || updated.hasAssignments || (updated.assignedUnitsCount && updated.assignedUnitsCount > 0));
          const statusUpdated = (updated.status || '').toString().toUpperCase() || 'PENDING';

          if (marker) {
            // Only move marker if backend coordinates differ significantly to avoid jumps
            const updatedLat = parseFloat(updated.latitude);
            const updatedLon = parseFloat(updated.longtitude || updated.longitude || 0);
            if (isFinite(updatedLat) && isFinite(updatedLon)) {
              const currentLatLng = marker.getLatLng && marker.getLatLng();
              const latDiff = currentLatLng ? Math.abs(currentLatLng.lat - updatedLat) : Number.POSITIVE_INFINITY;
              const lonDiff = currentLatLng ? Math.abs(currentLatLng.lng - updatedLon) : Number.POSITIVE_INFINITY;
              if (latDiff > 0.00001 || lonDiff > 0.00001) {
                if (marker.setLatLng) marker.setLatLng([updatedLat, updatedLon]);
              }
            }

            if (marker.setIcon) marker.setIcon(createIncidentIcon(updated.type, severity, hasActiveUpdated, statusUpdated));
            if (marker.bindPopup) marker.bindPopup(`<strong>Incident #${updated.incidentId}</strong><br/>Type: ${updated.type}<br/>Severity: ${updated.severityLevel}<br/>Status: ${statusUpdated}`);
          } else {
            addOrUpdateIncident(updated);
          }
        }).catch(e => console.error('Failed to move incident to Las Vegas', e));
    };

    // Handle assignment updates (single assignment or list of assignments)
    const processAssignment = (assignment) => {
      if (!assignment) return;
      try {
        // If the assignment includes the emergencyUnit object, update metadata only (not position)
        // to avoid DB-sourced coordinate jumps. Positions come only from Redis batches.
        if (assignment.emergencyUnit) {
          const unitId = assignment.emergencyUnit.unitID || assignment.emergencyUnit.unitId;
          updateUnitMeta({ unitID: unitId, type: assignment.emergencyUnit.type, status: assignment.emergencyUnit.status });
          const marker = markersRef.current.units.get(unitId);
          if (marker && typeof marker.setOpacity === 'function') {
            marker.setOpacity(assignment.emergencyUnit.status ? 1.0 : 0.5);
          }
        } else if (assignment.unitId || assignment.emergencyUnitId) {
          // Fetch updated unit metadata (not position) if only ID provided
          const uid = assignment.unitId || assignment.emergencyUnitId;
          fetch(`${API_BASE}/api/emergency-units/${uid}`).then(r => r.json()).then(u => {
            updateUnitMeta({ unitID: u.unitID, type: u.type, status: u.status });
            const marker = markersRef.current.units.get(u.unitID);
            if (marker && typeof marker.setOpacity === 'function') {
              marker.setOpacity(u.status ? 1.0 : 0.5);
            }
          }).catch(e => console.warn('Failed to fetch unit metadata for assignment update', e));
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

    const handleAssignmentUpdate = async (assignment) => {
      try {
        if (Array.isArray(assignment)) {
          assignment.forEach(processAssignment);
        } else {
          processAssignment(assignment);
        }
      } catch (e) {
        console.error('Error processing assignment(s)', e);
      }

      // --- OPTIMIZATION: COMMENTED OUT REDUNDANT FETCHES ---
      // The backend now sends explicit 'incidentUpdate' messages via WebSocket
      // when assignments change, so we don't need to fetch the entire list again.
      // This prevents "Self-DDoS" when 500 incidents exist.
      /*
      try {
        const res = await fetch(`${API_BASE}/api/monitor/incidents`);
        if (res.ok) {
          const enriched = await res.json();
          applyEnrichedIncidents(enriched);
        }
      } catch (e) {
        console.warn('Failed to refresh enriched incidents after assignment update', e);
      }

      try {
        const res2 = await fetch(`${API_BASE}/api/monitor/units`);
        if (res2.ok) {
          const units = await res2.json();
          if (Array.isArray(units)) {
            units.forEach(u => {
              updateUnitMeta({ unitID: u.unitID, type: u.type, status: u.status });
              const marker = markersRef.current.units.get(u.unitID);
              if (marker && typeof marker.setOpacity === 'function') {
                marker.setOpacity(u.status ? 1.0 : 0.5);
              }
            });
          }
        }
      } catch (e) {
        console.warn('Failed to refresh unit metadata after assignment update', e);
      }
      */
    };

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const bumpSimActivity = () => {
      // Ignore activity triggered by manual unit generation to avoid falsely marking sim as running
      if (isGeneratingUnitsRef.current) return;
      lastSimActivityRef.current = Date.now();
    };

    const handleLocationBatch = (batch) => {
      if (!batch) return;
      const keys = Object.keys(batch || {});
      const batchSize = keys.length;
      // If batch is very large, skip smooth animations to avoid overloading the main thread
      disableSmoothMovementRef.current = (batchSize > MAX_ANIMATE_UNITS);

      keys.forEach((unitIdKey) => {
        const value = batch[unitIdKey];
        const lat = parseFloat(value.lat ?? value.latitude);
        const lon = parseFloat(value.lon ?? value.long ?? value.longitude);
        if (!isFinite(lat) || !isFinite(lon)) return;

        const numericId = Number.parseInt(unitIdKey, 10);
        const resolvedId = Number.isNaN(numericId) ? unitIdKey : numericId;
        const cached = unitMetaRef.current.get(resolvedId) || {};
        addOrUpdateUnit({
          unitID: resolvedId,
          latitude: lat,
          longtitude: lon,
          type: cached.type,
          status: typeof cached.status === 'boolean' ? cached.status : undefined
        });
      });

      // Re-enable smooth movement shortly after processing to restore smoothness for small updates
      if (disableSmoothMovementRef.current) {
        setTimeout(() => { disableSmoothMovementRef.current = false; }, 1000);
      }

      initialLocationsLoadedRef.current = true;
    };

    // --- NEW: POLLING SETUP ---
    // Start Polling Loop for locations (replaces WebSocket for high-frequency updates)
    pollIntervalRef.current = setInterval(async () => {
      // if (!simulationRunning) return; // Optional: Only poll if running
      try {
        const res = await fetch(POLLING_ENDPOINT);
        if (res.ok) {
          const data = await res.json();
          // Call directly without bumping sim activity to avoid recursive loops
          handleLocationBatch(data); 
        }
      } catch (e) {
        console.warn("Polling error:", e);
      }
    }, POLLING_INTERVAL_MS);

    // Wrap certain handlers to also mark simulation activity
    const handleAssignmentUpdateWithActivity = (a) => { bumpSimActivity(); handleAssignmentUpdate(a); };
    const handleAssignmentsListWithActivity = (list) => { bumpSimActivity(); handleAssignmentUpdate(list); };
    const handleUnitUpdateWithActivity = (u) => { bumpSimActivity(); handleUnitUpdate(u); };
    const handleIncidentAdded = (inc) => { handleIncident(inc); };
    const handleIncidentsMonitorList = (list) => { if (Array.isArray(list)) applyEnrichedIncidents(list); };
    
    // NOTE: WebSocket listener for 'locationBatch' is removed in favor of Polling above
    // const handleLocationBatchWithActivity = (batch) => { bumpSimActivity(); handleLocationBatch(batch); };

    // When a raw incidents list is received from the simulation, request the enriched incident view
    // (includes active assignment counts and status) and apply it atomically to the map.
    const handleIncidentsList = async (list) => {
      try {
        const res = await fetch(`${API_BASE}/api/monitor/incidents`);
        if (res.ok) {
          const enriched = await res.json();
          applyEnrichedIncidents(enriched);
        } else {
          console.warn('Failed to fetch enriched incidents, status:', res.status);
        }
      } catch (e) {
        console.warn('Error fetching enriched incidents', e);
      }
    };

    // Full list broadcasts (units/incidents/assignments) are not treated as simulation activity
    // so refreshing or connecting legacy test pages doesn't flip the simulation badge.
    websocketService.on('unitsList', handleUnitsList);
    websocketService.on('unitUpdate', handleUnitUpdateWithActivity);
    websocketService.on('unitLocation', () => { /* ignored - frequent location updates disabled */ });
    websocketService.on('unitRoute', () => { /* ignored - route visualization disabled */ });
    websocketService.on('incidentAdded', handleIncidentAdded);
    websocketService.on('incidentsList', handleIncidentsList);
    websocketService.on('incidentsMonitorList', handleIncidentsMonitorList);
    websocketService.on('incidentUpdate', (i) => { handleIncidentUpdate(i); });
    websocketService.on('assignmentUpdate', handleAssignmentUpdateWithActivity);
    websocketService.on('assignmentsList', handleAssignmentsListWithActivity);
    // websocketService.on('locationBatch', handleLocationBatchWithActivity); // <-- DISABLED (Using Polling)
    websocketService.on('connected', handleConnect);
    websocketService.on('disconnected', handleDisconnect);

    // Prime unit metadata (type/status) without moving markers from stale DB coordinates
    fetch(`${API_BASE}/api/monitor/units`).then(r => r.json()).then(units => {
      if (Array.isArray(units)) {
        units.forEach(u => updateUnitMeta({ unitID: u.unitID, type: u.type, status: u.status }));
      }
    }).catch(e => {
      console.warn('Error fetching unit metadata from monitor endpoint', e);
    });

    // Seed initial positions directly from Redis (same source as real-time batches)
    (async () => {
      try {
        const res = await fetch(REDIS_LOCATIONS_ENDPOINT);
        if (res.ok) {
          const snapshot = await res.json();
          handleLocationBatch(snapshot);
        } else {
          console.warn('Redis location snapshot endpoint unavailable, status:', res.status);
        }
      } catch (e) {
        console.warn('Failed to fetch Redis-backed unit locations; relying on Polling', e);
      }
    })();

    // Use the enriched monitor endpoint initially so incidents show assignment/count/status metadata
    fetch(`${API_BASE}/api/monitor/incidents`).then(r => r.json()).then(incidents => {
      if (Array.isArray(incidents)) applyEnrichedIncidents(incidents);
    }).catch(e => {
      // fallback to raw list if monitor endpoint unavailable
      fetch(`${API_BASE}/api/incidents`).then(r => r.json()).then(incidents => { if (Array.isArray(incidents)) incidents.forEach(addOrUpdateIncident); }).catch(e => console.warn('Error fetching incidents', e));
      console.warn('Error fetching enriched incidents', e);
    });

    return () => {
      websocketService.off('unitsList', handleUnitsList);
      websocketService.off('unitUpdate', handleUnitUpdateWithActivity);
      websocketService.off('unitLocation');
      websocketService.off('unitRoute');
      websocketService.off('incidentAdded', handleIncidentAdded);
      websocketService.off('incidentsList', handleIncidentsList);
      websocketService.off('incidentsMonitorList', handleIncidentsMonitorList);
      websocketService.off('incidentUpdate');
      websocketService.off('assignmentUpdate', handleAssignmentUpdateWithActivity);
      websocketService.off('assignmentsList', handleAssignmentsListWithActivity);
      // websocketService.off('locationBatch', handleLocationBatchWithActivity); // <-- DISABLED
      websocketService.off('connected', handleConnect);
      websocketService.off('disconnected', handleDisconnect);
      
      // Cleanup Polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (simActivityTimerRef.current) { clearInterval(simActivityTimerRef.current); simActivityTimerRef.current = null; }
      if (mapRef.current) mapRef.current.remove();
    };
  }, []); // Re-run once on mount

  // Sync map control input value with React state
  useEffect(() => {
    const input = document.getElementById('mapUnitCount');
    if (input) input.value = unitCount;
  }, [unitCount]);

  // Monitor recent websocket activity to heuristically determine if the simulation is running
  useEffect(() => {
    // Check every 2 seconds; if we saw activity within the last 10 seconds assume simulation is active
    // If the user explicitly started the simulation via the UI, keep the badge showing Running until they press Stop
    simActivityTimerRef.current = setInterval(() => {
      const last = lastSimActivityRef.current;
      if (explicitSimStartRef.current) {
        // Keep showing running until the user explicitly stops it
        setSimulationRunning(true);
        return;
      }
      if (last && (Date.now() - last) < 10000) {
        setSimulationRunning(true);
      } else {
        setSimulationRunning(false);
      }
    }, 2000);
    return () => { if (simActivityTimerRef.current) { clearInterval(simActivityTimerRef.current); simActivityTimerRef.current = null; } };
  }, []);

  function updateUnitMeta(unit) {
    if (!unit || unit.unitID == null) return null;
    const existingMeta = unitMetaRef.current.get(unit.unitID) || {};
    const resolvedType = unit.type ?? existingMeta.type ?? 'UNKNOWN';
    const resolvedStatus = (typeof unit.status === 'boolean') ? unit.status : (typeof existingMeta.status === 'boolean' ? existingMeta.status : true);
    const meta = { type: resolvedType, status: resolvedStatus };
    unitMetaRef.current.set(unit.unitID, meta);
    return { resolvedType, resolvedStatus };
  }

  function addOrUpdateUnit(unit) {
    if (!unit || unit.unitID == null) return;
    const id = unit.unitID;
    const lat = parseFloat(unit.latitude);
    const lon = parseFloat(unit.longtitude || unit.longitude || 0);
    if (!isFinite(lat) || !isFinite(lon)) return;

    const meta = updateUnitMeta(unit);
    const resolvedType = meta?.resolvedType ?? 'UNKNOWN';
    const resolvedStatus = (typeof meta?.resolvedStatus === 'boolean') ? meta.resolvedStatus : true;

    const popup = `<strong>Unit #${id}</strong><br/>Type: ${resolvedType}<br/>Status: ${resolvedStatus ? 'Available' : 'Busy'}`;

    // If this unit was recently generated and we stored a chosen target, avoid animating when the server confirms the same coords
    let skipAnimate = false;
    const pending = generatedTargetsRef.current.get(id);
    if (pending) {
      const dLat = Math.abs(lat - pending.lat);
      const dLon = Math.abs(lon - pending.lon);
      if (dLat < 0.00005 && dLon < 0.00005) {
        skipAnimate = true;
        generatedTargetsRef.current.delete(id);
      }
    }

    if (markersRef.current.units.has(id)) {
      const marker = markersRef.current.units.get(id);
      // Smoothly animate position changes rather than jumping
      try {
        const current = marker.getLatLng && marker.getLatLng();
        const curLat = current ? current.lat : lat;
        const curLng = current ? current.lng : lon;
        const latDiff = Math.abs(curLat - lat);
        const lonDiff = Math.abs(curLng - lon);
        // Only animate if movement is meaningful to avoid unnecessary work
        const meaningfulMove = (latDiff > 0.00001 || lonDiff > 0.00001);
        const allowSmooth = !disableSmoothMovementRef.current && !skipAnimate;
        if (meaningfulMove && marker.setLatLng) {
          if (!allowSmooth) {
            // Too many units at once — apply immediate move to avoid CPU spike
            marker.setLatLng([lat, lon]);
          } else {
            animateMarkerTo(marker, lat, lon, 800);
          }
        } else if (marker.setLatLng) {
          marker.setLatLng([lat, lon]);
        }
      } catch (e) {
        // fallback to direct set
        if (marker.setLatLng) marker.setLatLng([lat, lon]);
      }

      if (marker.setIcon) {
        marker.setIcon(createCarIcon(resolvedType));
      } else {
        // fallback: remove and recreate marker
        try { if (marker && marker._moveAnimation) { marker._moveAnimation.cancelled = true; marker._moveAnimation = null; } } catch(e) {}
        mapRef.current.removeLayer(marker);
        const newMarker = L.marker([lat, lon], { icon: createCarIcon(resolvedType) }).addTo(mapRef.current);
        newMarker.bindPopup(popup);
        markersRef.current.units.set(id, newMarker);
      }
      // Dim or highlight marker based on status (busy vs available)
      if (typeof marker.setOpacity === 'function') marker.setOpacity(resolvedStatus ? 1.0 : 0.5);
      marker.bindPopup(popup);
    } else {
      // Create a marker with a car icon instead of a circle
      const marker = L.marker([lat, lon], { icon: createCarIcon(resolvedType) }).addTo(mapRef.current);
      marker.bindPopup(popup);
      if (typeof marker.setOpacity === 'function') marker.setOpacity(resolvedStatus ? 1.0 : 0.5);
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
    const checkSvg = showCheck ? '<path d="M9 11l2 2 4-4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' : '';
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g class="pin-shadow">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 11 7 11s7-5.75 7-11c0-3.87-3.13-7-7-7z" fill="${color}" fill-opacity="${opacity}" />
        </g>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 11 7 11s7-5.75 7-11c0-3.87-3.13-7-7-7z" fill="${color}" style="${strokeStyle}" />
        ${dispatchRing}
        <circle cx="12" cy="9.5" r="3.1" fill="${innerColor}" />
        ${checkSvg}
      </svg>`;
    const className = 'incident-pin-icon incident-status-' + statusStr.toLowerCase();
    return L.divIcon({ html: svg, className, iconSize: [size, size], iconAnchor: [Math.floor(size/2), size], popupAnchor: [0, -Math.floor(size/2)] });
  }

  // Apply a list of enriched incidents atomically: remove stale markers and add/update current markers
  function applyEnrichedIncidents(enrichedList) {
    if (!Array.isArray(enrichedList)) return;
    const ids = new Set(enrichedList.map(i => i.incidentId || i.incident_id || i.id));
    // Remove markers not present in the incoming enriched list
    for (const [existingId, marker] of Array.from(markersRef.current.incidents.entries())) {
      if (!ids.has(existingId)) {
        try { mapRef.current.removeLayer(marker); } catch (e) { /* ignore */ }
        markersRef.current.incidents.delete(existingId);
      }
    }
    // Add or update incoming incidents
    enrichedList.forEach(i => {
      const inc = {
        incidentId: i.incidentId || i.incident_id || i.id,
        type: i.type,
        latitude: i.latitude,
        longtitude: i.longtitude || i.longitude,
        severityLevel: i.severityLevel || i.severity || i.severity_level,
        status: i.status,
        hasActiveAssignments: i.hasActiveAssignments,
        hasAssignments: i.hasAssignments,
        assignedUnitsCount: i.assignedUnitsCount || i.totalAssignmentsCount
      };
      addOrUpdateIncident(inc);
    });
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

    // Build the desired icon once
    const desiredIcon = createIncidentIcon(inc.type, severity, hasActive, status);

    if (markersRef.current.incidents.has(id)) {
      const marker = markersRef.current.incidents.get(id);

      // Update position immediately
      if (marker.setLatLng) marker.setLatLng([lat, lon]);

      // Compare metadata to avoid unnecessary icon swaps that cause visual flashes
      const prevMeta = marker._incidentMeta || {};
      const metaChanged = prevMeta.status !== status || prevMeta.type !== (inc.type || '') || prevMeta.hasActive !== hasActive || prevMeta.severity !== severity;

      if (metaChanged) {
        try {
          if (marker.setIcon) {
            // Apply icon only if it meaningfully changed
            marker.setIcon(desiredIcon);
          } else {
            // fallback for older circle markers: remove and recreate as marker
            mapRef.current.removeLayer(marker);
            const newMarker = L.marker([lat, lon], { icon: desiredIcon }).addTo(mapRef.current);
            newMarker.bindPopup(popup);
            markersRef.current.incidents.set(id, newMarker);
          }
          // Store current meta for future diffs
          const currentMarker = markersRef.current.incidents.get(id);
          if (currentMarker) currentMarker._incidentMeta = { status, type: inc.type || '', hasActive, severity };

          // If completed, ensure dimming is immediately applied (redundant with CSS class but makes it explicit)
          if (status === 'COMPLETED') {
            const m = markersRef.current.incidents.get(id);
            if (m && typeof m.setOpacity === 'function') m.setOpacity(0.72);
          }
        } catch (e) {
          // if anything goes wrong fallback to direct set
          try { if (marker.setLatLng) marker.setLatLng([lat, lon]); } catch (e2) {}
        }
      }

      // re-bind popup to whichever marker is current
      const currentMarker = markersRef.current.incidents.get(id);
      if (currentMarker && currentMarker.bindPopup) currentMarker.bindPopup(popup);
    } else {
      // Create marker with the desired icon already set (avoid intermediate states)
      const marker = L.marker([lat, lon], { icon: desiredIcon }).addTo(mapRef.current);
      marker.bindPopup(popup);
      marker._incidentMeta = { status, type: inc.type || '', hasActive, severity };
      if (status === 'COMPLETED' && typeof marker.setOpacity === 'function') marker.setOpacity(0.72);
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

  // Smoothly animate a marker from its current position to the given lat/lng. Uses requestAnimationFrame
  // and a gentle ease to make unit movement appear smooth when they move to incidents.
  function animateMarkerTo(marker, toLat, toLng, duration = 700) {
    if (!marker || typeof marker.getLatLng !== 'function' || typeof marker.setLatLng !== 'function') return;

    // cancel any active animation
    if (marker._moveAnimation) { marker._moveAnimation.cancelled = true; marker._moveAnimation = null; }

    const startLatLng = marker.getLatLng() || { lat: toLat, lng: toLng };
    const startLat = startLatLng.lat;
    const startLng = startLatLng.lng;
    const deltaLat = toLat - startLat;
    const deltaLng = toLng - startLng;
    if (Math.abs(deltaLat) < 1e-10 && Math.abs(deltaLng) < 1e-10) return;

    const startTime = performance.now();
    const anim = { cancelled: false };
    marker._moveAnimation = anim;

    // easeInOutQuad
    const ease = (t) => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;

    function step(now) {
      if (anim.cancelled) { marker._moveAnimation = null; return; }
      const t = Math.min(1, (now - startTime) / duration);
      const eased = ease(t);
      const curLat = startLat + deltaLat * eased;
      const curLng = startLng + deltaLng * eased;
      marker.setLatLng([curLat, curLng]);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        marker._moveAnimation = null;
      }
    }
    requestAnimationFrame(step);
  }

  function stopMarkerAnimation(marker) {
    if (marker && marker._moveAnimation) { marker._moveAnimation.cancelled = true; marker._moveAnimation = null; }
  }

  async function generateUnits(countParam) {
    const count = (typeof countParam !== 'undefined') ? countParam : unitCount;
    if (!count || count < 1) return alert('Enter a valid number');

    isGeneratingUnitsRef.current = true;

    // disable map button to prevent duplicate clicks
    const btn = document.getElementById('mapGenerateBtn');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/api/emergency-units/generator/generate-random?count=${count}`, { method: 'POST' });
      const created = await res.json();
      console.log('Created units:', created);

      if (Array.isArray(created)) {
          // Choose final Las Vegas coordinates up front so we can persist them and render server-confirmed positions.
        const createdWithTargets = created.map(u => {
          const coords = randomLasVegas();
          return { ...u, latitude: coords.lat, longtitude: coords.lng, longitude: coords.lng };
        });

        // Persist chosen coordinates for each unit and render based on server confirmation when possible.
        await Promise.all(createdWithTargets.map(async (u) => {
          // remember pending target to avoid visual jitter when server confirms the same location
          generatedTargetsRef.current.set(u.unitID, { lat: u.latitude, lon: u.longtitude || u.longitude });
          const cleanup = setTimeout(() => generatedTargetsRef.current.delete(u.unitID), 5000);
          try {
            // Prefer REST PUT to persist location; when backend echoes the unit it's authoritative.
            const res2 = await fetch(`${API_BASE}/api/emergency-units/${u.unitID}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude: u.latitude, longtitude: u.longtitude || u.longitude, type: u.type, capacity: u.capacity, status: u.status })
            });
            if (res2.ok) {
              const updated = await res2.json();
              addOrUpdateUnit(updated);
            } else {
              // fallback to local render and attempt websocket update
              addOrUpdateUnit(u);
              websocketService.connect().then(() => {
                websocketService.send('/app/unit.updateLocation', { unitId: u.unitID, latitude: u.latitude, longitude: u.longtitude || u.longitude });
              }).catch(() => {});
            }
          } catch (err) {
            // network error: render locally and try websocket push
            addOrUpdateUnit(u);
            try { websocketService.connect().then(() => websocketService.send('/app/unit.updateLocation', { unitId: u.unitID, latitude: u.latitude, longitude: u.longtitude || u.longitude })); } catch (e) {}
          } finally {
            clearTimeout(cleanup);
            generatedTargetsRef.current.delete(u.unitID);
          }
        }));
        // Show alert asynchronously so units render immediately without being blocked
        setTimeout(() => alert(`Created ${createdWithTargets.length} unit(s)`), 100);
      } else {
        alert('Unexpected response from server');
      }
    } catch (e) {
      alert('Error generating units: ' + e);
    } finally {
      if (btn) btn.disabled = false;
      // Keep suppression a bit longer to let initial location updates arrive
      setTimeout(() => { isGeneratingUnitsRef.current = false; }, 800);
    }
  }

  function startSimulation() {
    fetch(`${API_BASE}/api/simulation/start`, { method: 'POST' })
      .then(r => r.text())
      .then(t => {
        alert(t);
        explicitSimStartRef.current = true;
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
        explicitSimStartRef.current = false;
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
        <button className="analytics-btn" onClick={() => navigate('/analytics')} style={{padding:8,background:'#007bff',color:'#fff',borderRadius:6}}>📊 Analytics</button>
        </div>
        <div style={{marginLeft:'auto',fontWeight:700}}>WS: {connected ? 'Connected' : 'Disconnected'}</div>
      </div>
      <div id="simulation-map-root" style={{height:'calc(100vh - 64px)'}}></div>
    </div>
  );
}