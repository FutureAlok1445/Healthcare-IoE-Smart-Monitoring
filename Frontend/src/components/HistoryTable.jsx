import React from 'react';
import {
  IconActivity,
  IconFlask,
  IconCheckCircle,
  IconAlertTriangle,
  IconAlertOctagon,
  IconClock,
} from './Icons';

export default function HistoryTable({ vitals = [] }) {
  if (!vitals || vitals.length === 0) {
    return (
      <div className="table-empty-notice">
        <IconClock size={20} color="var(--text-muted)" />
        <span>No vital sign observations recorded for this patient yet.</span>
      </div>
    );
  }

  return (
    <div className="clinical-table-container">
      <table className="clinical-data-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left', width: '130px' }}>Timestamp</th>
            <th style={{ textAlign: 'right' }}>Heart Rate</th>
            <th style={{ textAlign: 'right' }}>SpO2 Level</th>
            <th style={{ textAlign: 'right' }}>Skin Temp</th>
            <th style={{ textAlign: 'center', width: '140px' }}>Source</th>
            <th style={{ textAlign: 'center', width: '120px' }}>Clinical State</th>
          </tr>
        </thead>
        <tbody>
          {vitals.slice(0, 10).map((v, idx) => {
            const timeStr = v.received_at
              ? new Date(v.received_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '—';

            const isCritical = v.state === 'CRITICAL' || v.motion_flag || v.spo2 < 90 || v.heart_rate > 130;
            const isWarning =
              v.state === 'WATCH' || v.spo2 < 92 || v.heart_rate > 120 || v.temperature > 38.0;
            const stateStr = isCritical ? 'CRITICAL' : isWarning ? 'WATCH' : 'NOMINAL';
            const stateClass = isCritical ? 'status-pill-danger' : isWarning ? 'status-pill-warning' : 'status-pill-ok';

            const isSim = (v.source || '').toLowerCase() === 'simulation';

            return (
              <tr key={v.id || `${v.received_at || 'vital'}-${idx}`} className={isCritical ? 'tr-breached' : ''}>
                <td className="table-timestamp tabular-nums">
                  <span className="time-inner">{timeStr}</span>
                </td>
                <td className="table-num-cell tabular-nums">
                  <span className={`vital-val-highlight ${v.heart_rate > 120 ? 'val-danger' : ''}`}>
                    {Number(v.heart_rate).toFixed(0)}
                  </span>
                  <span className="unit-suffix">BPM</span>
                </td>
                <td className="table-num-cell tabular-nums">
                  <span className={`vital-val-highlight ${v.spo2 < 92 ? 'val-danger' : ''}`}>
                    {Number(v.spo2).toFixed(1)}
                  </span>
                  <span className="unit-suffix">%</span>
                </td>
                <td className="table-num-cell tabular-nums">
                  <span className={`vital-val-highlight ${v.temperature > 38.0 ? 'val-danger' : ''}`}>
                    {Number(v.temperature).toFixed(1)}
                  </span>
                  <span className="unit-suffix">°C</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`source-pill ${isSim ? 'source-pill-sim' : 'source-pill-hw'}`}>
                    {isSim ? <IconFlask size={11} /> : <IconActivity size={11} />}
                    <span>{isSim ? 'Demonstration' : 'Bedside Monitor'}</span>
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`table-status-pill ${stateClass}`}>
                    {isCritical ? (
                      <IconAlertOctagon size={11} />
                    ) : isWarning ? (
                      <IconAlertTriangle size={11} />
                    ) : (
                      <IconCheckCircle size={11} />
                    )}
                    <span>{stateStr}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
