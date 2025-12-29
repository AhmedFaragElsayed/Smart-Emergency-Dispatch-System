import React, { useEffect, useState } from 'react';
import apiService from '../services/apiService';
import '../styles/Analytics.css';

// Charts
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const defaultDate = (d) => d.toISOString().slice(0,10);

const Analytics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const today = new Date();
  const [from, setFrom] = useState(defaultDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)));
  const [to, setTo] = useState(defaultDate(today));
  const [topN, setTopN] = useState(5);
  const [heatmapK, setHeatmapK] = useState(10);

  const [applying, setApplying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.fetchDispatchMetrics(params);
      setMetrics(data);
    } catch (err) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    try {
      await load({ from, to, topN, heatmapK });
    } catch (err) {
      // handled in load
    } finally {
      setApplying(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await apiService.downloadDispatchReportPdf({ from, to, topN, heatmapK });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dispatch_report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const humanize = (k) => {
    const map = {
      incidentsByType: 'Incidents by Type',
      incidentsByStatus: 'Incidents by Status',
      incidentsBySeverity: 'Incidents by Severity',
      avgResolutionDays: 'Average resolution (days)',
      responseTimeByType: 'Response time by Type',
      responseTimeByDay: 'Response time by Day',
      responseTimeByMonth: 'Response time by Month',
      utilizationRatio: 'Utilization Ratio',
      utilizationByUnitType: 'Utilization by Unit Type',
      topUnitsByAvgResolution: 'Top Units by Avg Resolution',
      topUnitsByAssignmentCount: 'Top Units by Assignment Count',
      incidentsByDay: 'Incidents by Day',
      incidentHeatmapTop: 'Top Hotspots',
    };
    return map[k] || k;
  };

  const renderArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return <p className="muted">No data</p>;
    if (arr.every(a => typeof a !== 'object' || a === null)) {
      return (
        <ul className="simple-list">
          {arr.map((v, i) => <li key={i}>{String(v)}</li>)}
        </ul>
      );
    }
    const columns = Array.from(arr.reduce((set, obj) => {
      if (obj && typeof obj === 'object') Object.keys(obj).forEach(k => set.add(k));
      return set;
    }, new Set()));

    return (
      <div className="table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              {columns.map(c => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {arr.map((row, i) => (
              <tr key={i}>
                {columns.map(c => <td key={c}>{row && row[c] !== undefined ? String(row[c]) : ''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMetric = (key, value) => {
    const title = humanize(key);
    if (value === null || value === undefined) {
      return (
        <div className="analytics-section" key={key}>
          <h3>{title}</h3>
          <p className="muted">N/A</p>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div className="analytics-section" key={key}>
          <h3>{title}</h3>
          {renderArray(value)}
        </div>
      );
    }

    if (typeof value === 'number') {
      return (
        <div className="analytics-card" key={key}>
          <h3>{title}</h3>
          <p className="big-number">{Number.isFinite(value) ? value.toFixed(2) : String(value)}</p>
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="analytics-section" key={key}>
          <h3>{title}</h3>
          <table className="analytics-table">
            <tbody>
              {Object.entries(value).map(([k, v]) => (
                <tr key={k}><td>{k}</td><td>{String(v)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="analytics-section" key={key}>
        <h3>{title}</h3>
        <p>{String(value)}</p>
      </div>
    );
  };

  // Chart data builders
  const buildPieData = () => {
    const arr = metrics?.incidentsByType || [];
    return {
      labels: arr.map(r => r.type),
      datasets: [{
        data: arr.map(r => Number(r.cnt) || 0),
        backgroundColor: ['#667eea', '#f6ad55', '#fc8181', '#48bb78', '#38bdf8', '#a78bfa'],
      }]
    };
  };

  const buildBarData = () => {
    const arr = metrics?.incidentsByDay || [];
    const sorted = arr.slice().sort((a,b) => String(a.day).localeCompare(String(b.day)));
    return {
      labels: sorted.map(r => r.day),
      datasets: [{ label: 'Incidents', data: sorted.map(r => Number(r.cnt) || 0), backgroundColor: '#667eea' }]
    };
  };

  const buildLineData = () => {
    const arr = metrics?.responseTimeByDay || [];
    const sorted = arr.slice().sort((a,b) => String(a.day).localeCompare(String(b.day)));
    return {
      labels: sorted.map(r => r.day),
      datasets: [{ label: 'Avg resolution (days)', data: sorted.map(r => Number(r.avgDays) || 0), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', tension: 0.2 }]
    };
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Dispatch Analytics</h1>
        <div className="actions">
          <div className="filters">
            <label className="filter-group">From <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
            <label className="filter-group">To <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
            <label className="filter-group">Top N <input type="number" min="1" max="50" value={topN} onChange={e => setTopN(Number(e.target.value))} /></label>
            <label className="filter-group">Heatmap K <input type="number" min="1" max="200" value={heatmapK} onChange={e => setHeatmapK(Number(e.target.value))} /></label>
            <button className="primary-btn" onClick={handleApply} disabled={applying}>{applying ? 'Applying...' : 'Apply'}</button>
          </div>
          <div className="export">
            <button className="secondary-btn" onClick={handleDownloadPdf} disabled={downloading}>{downloading ? 'Downloading...' : 'Export PDF'}</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner-small" />
          <p>Loading analytics…</p>
        </div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="charts-row">
            <div className="chart-card">
              <h3>Incidents by Type</h3>
              <Pie data={buildPieData()} />
            </div>

            <div className="chart-card">
              <h3>Incidents by Day</h3>
              <Bar data={buildBarData()} options={{responsive:true, plugins:{legend:{display:false}}}} />
            </div>

            <div className="chart-card">
              <h3>Avg Resolution by Day</h3>
              <Line data={buildLineData()} options={{responsive:true, plugins:{legend:{display:false}}}} />
            </div>
          </div>

          <div className="analytics-grid">
            {Object.keys(metrics).map(k => renderMetric(k, metrics[k]))}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
