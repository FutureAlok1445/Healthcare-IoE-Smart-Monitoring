import React from 'react';
import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconCheckCircle,
  IconClock,
  IconShieldCheck,
  IconCheck,
} from './Icons';

export default function AlertLog({ alerts = [], onAcknowledge }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="alert-empty-card">
        <div className="empty-icon-halo">
          <IconShieldCheck size={36} color="var(--status-ok)" />
        </div>
        <h4 className="empty-title">All Vitals Nominal</h4>
        <p className="empty-desc">
          Continuous telemetry stream is within established clinical thresholds. Zero unacknowledged physiological breaches.
        </p>
        <div className="empty-status-tag">
          <span className="live-dot" />
          <span>Surveillance Engine Active</span>
        </div>
      </div>
    );
  }

  return (
    <div className="clinical-alert-feed">
      <div className="alert-feed-list">
        {alerts.slice(0, 8).map((a) => {
          const isCritical = a.level === 'CRITICAL';
          const isWarning = (a.level || '').toUpperCase() === 'WATCH';
          const isAck = a.acknowledged || a.status === 'ACKNOWLEDGED' || a.status === 'RESOLVED';

          const timeStr = a.created_at
            ? new Date(a.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : '—';

          return (
            <div
              key={a.id}
              className={`alert-feed-item ${isCritical ? 'item-critical' : isWarning ? 'item-warning' : 'item-info'} ${isAck ? 'item-acknowledged' : ''}`}
            >
              <div className="alert-item-left">
                <span className={`alert-badge-icon ${isCritical ? 'icon-critical' : isWarning ? 'icon-warning' : 'icon-info'}`}>
                  {isCritical ? (
                    <IconAlertOctagon size={16} />
                  ) : isWarning ? (
                    <IconAlertTriangle size={16} />
                  ) : (
                    <IconCheckCircle size={16} />
                  )}
                </span>
                <div className="alert-item-details">
                  <div className="alert-headline-row">
                    <span className="alert-level-tag">{a.level || 'WATCH'}</span>
                    <span className="alert-timestamp tabular-nums">
                      <IconClock size={11} />
                      {timeStr}
                    </span>
                  </div>
                  <p className="alert-item-msg">{a.message}</p>
                </div>
              </div>

              <div className="alert-item-right">
                {!isAck ? (
                  <button
                    type="button"
                    className="alert-ack-btn"
                    onClick={() => onAcknowledge(a.id)}
                    title="Acknowledge clinical alert"
                  >
                    <IconCheck size={13} />
                    <span>Acknowledge</span>
                  </button>
                ) : (
                  <span className="alert-ack-pill">
                    <IconCheckCircle size={12} />
                    <span>{a.status === 'RESOLVED' ? 'Resolved' : 'Ack’d'}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
