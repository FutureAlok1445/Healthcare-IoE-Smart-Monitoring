import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  IconBellRing,
  IconAlertOctagon,
  IconAlertTriangle,
  IconCheckCircle,
  IconClock,
  IconActivity,
  IconFlask,
  IconCheck,
  IconUser,
} from './Icons';

export default function AlertsTab({ alerts = [], onAcknowledge, onResolve }) {
  const [statusTab, setStatusTab] = useState('ALL'); // 'ALL' | 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED'
  const [severityFilter, setSeverityFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'WATCH'
  const [sourceFilter, setSourceFilter] = useState('ALL'); // 'ALL' | 'HARDWARE' | 'SIMULATION'
  const [timelineNow] = useState(() => Date.now());

  const activeCount = alerts.filter((a) => a.status === 'NEW' || !a.acknowledged).length;
  const ackCount = alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const resCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      // Status filter
      if (statusTab === 'NEW' && a.status !== 'NEW' && a.acknowledged) return false;
      if (statusTab === 'ACKNOWLEDGED' && (a.status !== 'ACKNOWLEDGED' || !a.acknowledged)) return false;
      if (statusTab === 'RESOLVED' && a.status !== 'RESOLVED') return false;

      // Severity filter
      if (severityFilter !== 'ALL' && (a.level || '').toUpperCase() !== severityFilter) return false;

      // Source filter
      if (sourceFilter !== 'ALL' && (a.source || 'hardware').toUpperCase() !== sourceFilter) return false;

      return true;
    });
  }, [alerts, statusTab, severityFilter, sourceFilter]);

  const timelineData = useMemo(() => {
    const bucketMs = 4 * 60 * 60 * 1000;
    const labels = [
      '00:00 - 04:00',
      '04:00 - 08:00',
      '08:00 - 12:00',
      '12:00 - 16:00',
      '16:00 - 20:00',
      '20:00 - 24:00',
    ];
    const buckets = labels.map((window) => ({ window, critical: 0, warning: 0 }));

    alerts.forEach((a) => {
      if (!a.created_at) return;
      const ageMs = timelineNow - new Date(a.created_at).getTime();
      if (ageMs < 0 || ageMs > 24 * 60 * 60 * 1000) return;
      const idx = Math.min(5, Math.floor((24 * 60 * 60 * 1000 - ageMs) / bucketMs));
      const level = (a.level || '').toUpperCase();
      if (level === 'CRITICAL') buckets[idx].critical += 1;
      else if (level === 'WATCH') buckets[idx].warning += 1;
    });

    return buckets;
  }, [alerts, timelineNow]);

  return (
    <div className="alerts-tab-container">
      {/* Header Banner */}
      <section className="alerts-header-banner">
        <div className="alerts-title-block">
          <div className="alerts-icon-box">
            <IconBellRing size={22} color="var(--status-danger)" />
          </div>
          <div>
            <h2>Clinical Incident & Audit Trail</h2>
            <p>Real-time log of vital boundary breaches, patient calls, and clinical staff acknowledgments.</p>
          </div>
        </div>

        {/* Lifecycle Tabs */}
        <div className="alert-lifecycle-tabs" role="tablist">
          <button
            type="button"
            className={`lifecycle-tab ${statusTab === 'ALL' ? 'tab-active' : ''}`}
            onClick={() => setStatusTab('ALL')}
          >
            All Incidents ({alerts.length})
          </button>
          <button
            type="button"
            className={`lifecycle-tab tab-new ${statusTab === 'NEW' ? 'tab-active' : ''}`}
            onClick={() => setStatusTab('NEW')}
          >
            Active / New ({activeCount})
          </button>
          <button
            type="button"
            className={`lifecycle-tab tab-ack ${statusTab === 'ACKNOWLEDGED' ? 'tab-active' : ''}`}
            onClick={() => setStatusTab('ACKNOWLEDGED')}
          >
            Acknowledged ({ackCount})
          </button>
          <button
            type="button"
            className={`lifecycle-tab tab-resolved ${statusTab === 'RESOLVED' ? 'tab-active' : ''}`}
            onClick={() => setStatusTab('RESOLVED')}
          >
            Resolved ({resCount})
          </button>
        </div>
      </section>

      {/* Incident Frequency Timeline Chart (24h) */}
      <section className="incident-timeline-panel">
        <div className="timeline-header-row">
          <div className="timeline-title">
            <IconClock size={16} color="var(--brand-primary)" />
            <h4>Incident Frequency Timeline (Last 24 Hours)</h4>
          </div>
          <div className="timeline-legend">
            <span className="legend-chip">
              <span className="legend-dot" style={{ background: '#dc2626' }} />
              Critical Breaches
            </span>
            <span className="legend-chip">
              <span className="legend-dot" style={{ background: '#d97706' }} />
              Watch Warnings
            </span>
          </div>
        </div>

        <div className="timeline-chart-body" style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="window" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-card)',
                  borderColor: 'var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="critical" fill="#dc2626" radius={[4, 4, 0, 0]} name="Critical Breaches" />
              <Bar dataKey="warning" fill="#d97706" radius={[4, 4, 0, 0]} name="Watch Warnings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Filter Controls Row */}
      <div className="alerts-controls-toolbar">
        <div className="filter-select-group">
          <label htmlFor="filter-severity">Severity Level:</label>
          <select
            id="filter-severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WATCH">Watch Only</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label htmlFor="filter-source">Alert Source:</label>
          <select
            id="filter-source"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Sources</option>
            <option value="HARDWARE">Bedside Monitors Only</option>
            <option value="SIMULATION">Simulated Drills Only</option>
          </select>
        </div>

        <div className="filter-results-counter">
          <span>Displaying <strong>{filteredAlerts.length}</strong> matching records</span>
        </div>
      </div>

      {/* Alerts Table */}
      {filteredAlerts.length === 0 ? (
        <div className="alerts-empty-state">
          <div className="empty-icon-halo">
            <IconCheckCircle size={36} color="var(--status-ok)" />
          </div>
          <h4>Zero Physiological Alerts in this Scope</h4>
          <p>No telemetry events or physiological breaches match the selected lifecycle and filter parameters.</p>
        </div>
      ) : (
        <div className="clinical-table-container">
          <table className="clinical-data-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Severity</th>
                <th style={{ width: '170px' }}>Patient / Ward Bed</th>
                <th>Breached Metric & Description</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Source</th>
                <th style={{ width: '120px' }}>Timestamp</th>
                <th style={{ width: '130px' }}>Attending Staff</th>
                <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((a) => {
                const isCritical = (a.level || '').toUpperCase() === 'CRITICAL';
                const isWarning = (a.level || '').toUpperCase() === 'WATCH';
                const isAck = a.acknowledged || a.status === 'ACKNOWLEDGED' || a.status === 'RESOLVED';
                const isResolved = a.status === 'RESOLVED';
                const isSim = (a.source || '').toLowerCase() === 'simulation';

                const timeStr = a.created_at
                  ? new Date(a.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '—';

                return (
                  <tr key={a.id} className={isCritical ? 'tr-critical-alert' : ''}>
                    {/* Severity Pill */}
                    <td>
                      <span className={`table-status-pill ${isCritical ? 'status-pill-danger' : isWarning ? 'status-pill-warning' : 'status-pill-ok'}`}>
                        {isCritical ? (
                          <IconAlertOctagon size={12} />
                        ) : isWarning ? (
                          <IconAlertTriangle size={12} />
                        ) : (
                          <IconCheckCircle size={12} />
                        )}
                        <span>{a.level || 'WATCH'}</span>
                      </span>
                    </td>

                    {/* Patient */}
                    <td>
                      <div className="cell-patient-col">
                        <span className="patient-col-name">{a.patient_name || '—'}</span>
                        <span className="patient-col-room">Bed {a.room || '—'}</span>
                      </div>
                    </td>

                    {/* Breach Message */}
                    <td>
                      <span className="breach-detail-text">{a.message}</span>
                    </td>

                    {/* Source */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`source-pill ${isSim ? 'source-pill-sim' : 'source-pill-hw'}`}>
                        {isSim ? <IconFlask size={11} /> : <IconActivity size={11} />}
                        <span>{isSim ? 'Simulation' : 'Bedside Monitor'}</span>
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="table-timestamp tabular-nums">
                      <span className="time-inner">
                        <IconClock size={11} />
                        {timeStr}
                      </span>
                    </td>

                    {/* Clinician */}
                    <td>
                      <span className="clinician-name-chip">
                        <IconUser size={12} />
                        <span>{a.acknowledged_by || a.resolved_by || '—'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-action-buttons">
                        {!isAck && (
                          <button
                            type="button"
                            className="btn-action-ack"
                            onClick={() => onAcknowledge(a.id)}
                            title="Acknowledge alert receipt"
                          >
                            <IconCheck size={12} />
                            <span>Acknowledge</span>
                          </button>
                        )}

                        {isAck && !isResolved && (
                          <button
                            type="button"
                            className="btn-action-resolve"
                            onClick={() => onResolve(a.id)}
                            title="Mark incident as clinically resolved"
                          >
                            <IconCheckCircle size={12} />
                            <span>Resolve</span>
                          </button>
                        )}

                        {isResolved && (
                          <span className="resolved-status-badge">
                            <IconCheckCircle size={12} />
                            <span>Resolved</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
