import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import websocketService from '../services/websocketService';
import '../styles/OverdueAlert.css';

const OverdueAlert = () => {
  const [alerts, setAlerts] = useState([]);

  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handler = (payload) => {
      // payload may be array or single incident
      const incidents = Array.isArray(payload) ? payload : [payload];
      const mapped = incidents.map((inc) => ({
        id: inc.incidentId || inc.id || Math.random().toString(36).slice(2,9),
        message: `Overdue incident #${inc.incidentId || inc.id} (${inc.type || inc.Type || 'unknown'}) - no assignment >2min`,
        incident: inc
      }));
      // Add only non-duplicate alerts (by incident id)
      setAlerts((prev) => {
        const existingIds = new Set(prev.map(p => p.id));
        const newOnes = mapped.filter(m => !existingIds.has(m.id));
        return [...newOnes, ...prev];
      });
      console.log('OverdueAlert: added', mapped.length, 'alerts');

      // Also add persistent notifications for current user (do not remove them when dismissing alerts)
      try {
        if (user && user.id) {
          mapped.forEach(m => {
            const stableId = `ov-${m.id}`;
            const note = {
              notificationId: stableId,
              notificationTime: Date.now(),
              message: m.message,
              incident: m.incident,
              user: { userID: user.id }
            };
            websocketService.addNotification(note);
          });
        }
      } catch (e) {
        console.warn('Failed to add persistent notifications:', e);
      }
    };

    websocketService.on('incidentsOverdue', handler);

    // expose quick trigger for manual testing in browser console
    if (typeof window !== 'undefined') {
      window.triggerOverdueTest = (mock) => {
        websocketService.simulateOverdue(mock || [{ incidentId: 9999, type: 'MEDICAL' }]);
      };
    }

    return () => {
      websocketService.off('incidentsOverdue', handler);
      if (typeof window !== 'undefined' && window.triggerOverdueTest) delete window.triggerOverdueTest;
    };
  }, []);

  const dismiss = (id) => setAlerts((prev) => prev.filter(a => a.id !== id));

  const handleCollapseAll = () => setCollapsed(true);
  const handleExpand = () => setCollapsed(false);
  const handleClearAll = () => setAlerts([]);

  if (!alerts.length && !collapsed) return null;

  return (
    <div className="overdue-alerts-container" role="status">
      {collapsed ? (
        <div className="overdue-collapsed-pill" onClick={handleExpand} title="Click to expand overdue alerts">
          Overdue ({alerts.length}) ▾
        </div>
      ) : (
        <>
          <div style={{display:'flex', justifyContent:'flex-end', marginBottom:8}}>
            <button className="clear-btn" onClick={handleCollapseAll} style={{marginRight:8}}>Collapse All</button>
            <button className="clear-btn" onClick={handleClearAll}>Clear All</button>
          </div>
          {alerts.map(a => (
            <div key={a.id} className="overdue-alert-item">
              <div className="overdue-alert-message">{a.message}</div>
              <div className="overdue-alert-meta">
                <button className="overdue-dismiss" onClick={() => dismiss(a.id)}>Dismiss</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default OverdueAlert;
