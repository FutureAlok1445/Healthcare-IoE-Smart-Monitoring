import React from 'react';
import {
  IconUsers,
  IconCheckCircle,
  IconAlertTriangle,
} from './Icons';

export default function PatientSelector({
  patients = [],
  selectedPatientId,
  onSelectPatient,
}) {
  return (
    <nav className="patient-rail-container" aria-label="Ward Patient Switcher">
      <div className="patient-rail-header">
        <div className="rail-label-group">
          <IconUsers size={15} color="var(--brand-primary)" />
          <span className="rail-label">Ward Patients</span>
          <span className="rail-count-badge tabular-nums">{patients.length} Monitored</span>
        </div>
      </div>

      <div className="patient-scroll-rail" role="tablist">
        {patients.map((p) => {
          const isSelected = p.id === selectedPatientId;
          const activeAlerts = Number(p.active_alerts_count || 0);

          // Get initials
          const initials = p.name
            ? p.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
            : 'PT';

          const conn = (p.connection_status || 'OFFLINE').toUpperCase();
          let dotClass = 'dot-online';
          if (activeAlerts > 0) dotClass = 'dot-critical';
          else if (conn === 'OFFLINE') dotClass = 'dot-offline';
          else if (conn === 'SIMULATED') dotClass = 'dot-simulated';
          else if (conn === 'STALE') dotClass = 'dot-offline';

          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`patient-rail-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectPatient(p.id)}
            >
              <div className="card-avatar-col">
                <div className={`patient-mini-avatar ${isSelected ? 'avatar-active' : ''}`}>
                  <span>{initials}</span>
                  <span className={`patient-presence-dot ${dotClass}`} />
                </div>
              </div>

              <div className="card-info-col">
                <div className="patient-name-row">
                  <span className="patient-chip-name">{p.name}</span>
                  {activeAlerts > 0 && (
                    <span className="alert-count-pip" title={`${activeAlerts} active alerts`}>
                      <IconAlertTriangle size={10} />
                      <span className="tabular-nums">{activeAlerts}</span>
                    </span>
                  )}
                </div>

                <div className="patient-meta-row">
                  <span className="bed-code-chip">{p.room || `Bed ${p.id}`}</span>
                  <span className={`patient-condition-text ${activeAlerts > 0 ? 'text-alert' : 'text-stable'}`}>
                    {activeAlerts > 0 ? (
                      <>
                        <IconAlertTriangle size={10} />
                        <span>Attention</span>
                      </>
                    ) : (
                      <>
                        <IconCheckCircle size={10} />
                        <span>Stable</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {isSelected && <div className="selected-active-bar" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
