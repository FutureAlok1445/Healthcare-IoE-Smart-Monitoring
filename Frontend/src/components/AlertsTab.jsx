import { useState } from 'react';
import { IconBell, IconAlertTriangle, IconCheck } from './Icons';

export default function AlertsTab({ alerts, onAcknowledge }) {
  const [filter, setFilter] = useState('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'UNACKNOWLEDGED') return !a.acknowledged;
    if (filter === 'CRITICAL') return a.level === 'CRITICAL';
    if (filter === 'WATCH') return a.level === 'WATCH';
    return true;
  });

  return (
    <div className="tab-container alerts-tab">
      <div className="tab-header-banner">
        <div>
          <h2>Clinical Alert & Incident Audit Trail</h2>
          <p className="tab-subtitle">
            Chronological audit log of biometric threshold violations and emergency dispatches
          </p>
        </div>
        <div className="alert-filter-tabs">
          {['ALL', 'UNACKNOWLEDGED', 'CRITICAL', 'WATCH'].map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="empty-panel">
          <IconBell size={32} color="#94a3b8" />
          <p className="empty-msg">No alerts found matching filter criteria.</p>
          <p className="empty-subtext">All telemetry readings within normal physiological ranges.</p>
        </div>
      ) : (
        <div className="alerts-audit-table-wrapper">
          <table className="alerts-audit-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Time</th>
                <th>Patient / Node</th>
                <th>Clinical Incident</th>
                <th>Channels Dispatched</th>
                <th>Status / Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((a) => (
                <tr key={a.id} className={`alert-row level-${a.level.toLowerCase()}`}>
                  <td>
                    <span className={`severity-tag ${a.level.toLowerCase()}`}>
                      <IconAlertTriangle size={12} />
                      {a.level}
                    </span>
                  </td>
                  <td className="alert-timestamp">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td>
                    <strong>{a.device_id || `Patient ${a.patient_id}`}</strong>
                  </td>
                  <td className="alert-message-cell">
                    {a.message}
                  </td>
                  <td className="channels-cell">
                    <small>{a.channels_sent || 'SMS, Email, Push Notification'}</small>
                  </td>
                  <td>
                    {a.acknowledged ? (
                      <span className="ack-status-tag">
                        <IconCheck size={13} color="#16a34a" />
                        Acknowledged
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-table-ack"
                        onClick={() => onAcknowledge(a.id)}
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
