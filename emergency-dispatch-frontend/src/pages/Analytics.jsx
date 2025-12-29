// src/pages/Analytics.jsx
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
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

  const loadMetrics = async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.fetchDispatchMetrics(params);
      setMetrics(data);
    } catch (err) {
      setError(err.message || 'Failed to load analytics data');
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleApply = async () => {
    setApplying(true);
    try {
      await loadMetrics({ from, to, topN, heatmapK });
    } catch (err) {
      // Error already handled in loadMetrics
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
      console.error('Error downloading PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const humanize = (key) => {
    const map = {
      incidentsByType: 'Incidents by Type',
      incidentsByStatus: 'Incidents by Status',
      incidentsBySeverity: 'Incidents by Severity',
      avgResolutionDays: 'Average Resolution Time (days)',
      responseTimeByType: 'Response Time by Type',
      responseTimeByDay: 'Response Time by Day',
      responseTimeByMonth: 'Response Time by Month',
      utilizationRatio: 'Unit Utilization Ratio',
      utilizationByUnitType: 'Utilization by Unit Type',
      topUnitsByAvgResolution: 'Top Units by Average Resolution Time',
      topUnitsByAssignmentCount: 'Top Units by Assignment Count',
      incidentsByDay: 'Incidents by Day',
      incidentHeatmapTop: 'Incident Hotspots',
    };
    return map[key] || key;
  };

  const renderArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) {
      return <div className="no-data">No data available</div>;
    }

    // Check if array contains simple values
    if (arr.every(item => typeof item !== 'object' || item === null)) {
      return (
        <div className="simple-list">
          {arr.map((item, index) => (
            <div key={index} className="list-item">{String(item)}</div>
          ))}
        </div>
      );
    }

    // Array of objects - create a table
    const columns = Array.from(
      arr.reduce((set, obj) => {
        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(key => set.add(key));
        }
        return set;
      }, new Set())
    );

    return (
      <div className="table-container">
        <table className="analytics-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}>{col.charAt(0).toUpperCase() + col.slice(1)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {arr.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map(col => (
                  <td key={col}>
                    {row && row[col] !== undefined ? String(row[col]) : '-'}
                  </td>
                ))}
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
          <div className="metric-value">N/A</div>
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
          <div className="big-number">
            {Number.isFinite(value) ? value.toFixed(2) : String(value)}
          </div>
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="analytics-section" key={key}>
          <h3>{title}</h3>
          <table className="key-value-table">
            <tbody>
              {Object.entries(value).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="analytics-section" key={key}>
        <h3>{title}</h3>
        <div className="metric-value">{String(value)}</div>
      </div>
    );
  };

  // Chart data builders
  const buildPieData = () => {
    const arr = metrics?.incidentsByType || [];
    return {
      labels: arr.map(r => r.type),
      datasets: [{
        data: arr.map(r => Number(r.count || r.value || r.cnt) || 0),
        backgroundColor: [
          '#667eea', '#f6ad55', '#fc8181', '#48bb78', 
          '#38bdf8', '#a78bfa', '#f87171', '#34d399'
        ],
      }]
    };
  };

  const buildBarData = () => {
    const arr = metrics?.incidentsByDay || [];
    const sorted = [...arr].sort((a, b) => 
      String(a.day || a.date).localeCompare(String(b.day || b.date))
    );
    return {
      labels: sorted.map(r => r.day || r.date),
      datasets: [{
        label: 'Incidents',
        data: sorted.map(r => Number(r.count || r.value || r.cnt) || 0),
        backgroundColor: '#667eea'
      }]
    };
  };

  const buildLineData = () => {
    const arr = metrics?.responseTimeByDay || [];
    const sorted = [...arr].sort((a, b) => 
      String(a.day || a.date).localeCompare(String(b.day || b.date))
    );
    return {
      labels: sorted.map(r => r.day || r.date),
      datasets: [{
        label: 'Avg resolution (days)',
        data: sorted.map(r => Number(r.avgDays || r.value || r.avg) || 0),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.1)',
        tension: 0.2
      }]
    };
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Dispatch Analytics</h1>
        <div className="actions">
          <div className="filters">
            <label className="filter-group">
              From 
              <input 
                type="date" 
                value={from} 
                onChange={e => setFrom(e.target.value)} 
              />
            </label>
            <label className="filter-group">
              To 
              <input 
                type="date" 
                value={to} 
                onChange={e => setTo(e.target.value)} 
              />
            </label>
            <label className="filter-group">
              Top N 
              <input 
                type="number" 
                min="1" 
                max="50" 
                value={topN} 
                onChange={e => setTopN(Number(e.target.value))} 
              />
            </label>
            <label className="filter-group">
              Heatmap K 
              <input 
                type="number" 
                min="1" 
                max="200" 
                value={heatmapK} 
                onChange={e => setHeatmapK(Number(e.target.value))} 
              />
            </label>
            <button 
              className="primary-btn" 
              onClick={handleApply} 
              disabled={applying}
            >
              {applying ? 'Applying...' : 'Apply'}
            </button>
          </div>
          <div className="export">
            <button 
              className="secondary-btn" 
              onClick={handleDownloadPdf} 
              disabled={downloading}
            >
              {downloading ? 'Downloading...' : 'Export PDF'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner-small" />
          <p>Loading analytics…</p>
        </div>
      ) : error ? (
        <div className="error-alert">
          <span>⚠️ {error}</span>
        </div>
      ) : metrics ? (
        <>
          <div className="charts-row">
            <div className="chart-card">
              <h3>Incidents by Type</h3>
              <div className="chart-wrapper">
                <Pie data={buildPieData()} />
              </div>
            </div>

            <div className="chart-card">
              <h3>Incidents by Day</h3>
              <div className="chart-wrapper">
                <Bar 
                  data={buildBarData()} 
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } }
                  }} 
                />
              </div>
            </div>

            <div className="chart-card">
              <h3>Avg Resolution by Day</h3>
              <div className="chart-wrapper">
                <Line 
                  data={buildLineData()} 
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } }
                  }} 
                />
              </div>
            </div>
          </div>

          <div className="analytics-grid">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key}>
                {renderMetric(key, value)}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="no-data">
          <p>No analytics data available. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
};

export default Analytics;