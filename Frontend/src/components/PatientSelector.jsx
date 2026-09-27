export default function PatientSelector({ patients, selectedPatientId, onSelectPatient }) {
  return (
    <div className="patient-selector-strip" role="region" aria-label="Patient Selector Strip">
      <div className="selector-title-group">
        <span className="patient-selector-label">Active Ward Patients</span>
        <span className="ward-count-chip">{patients.length} Monitored</span>
      </div>

      <div className="patient-pill-group">
        {patients.map((p) => {
          const isSelected = p.id === selectedPatientId;
          const status = p.connection_status || (p.isLiveNode ? 'ONLINE' : 'OFFLINE');
          const hasAlerts = (p.active_alerts_count || 0) > 0;

          return (
            <button
              key={p.id}
              type="button"
              className={`patient-pill ${isSelected ? 'active' : ''} status-${status.toLowerCase()}`}
              onClick={() => onSelectPatient(p.id)}
              title={`${p.name} — Room ${p.room || 'PT-0142'} (${p.device_id}) • Status: ${status}`}
            >
              <span className={`status-dot ${status.toLowerCase()}`} />
              <span className="patient-pill-name">{p.name}</span>
              <span className="patient-pill-room">{p.room || `P-${p.id}`}</span>
              {status === 'ONLINE' && <span className="live-hardware-tag">LIVE</span>}
              {hasAlerts && <span className="pill-alert-dot" title={`${p.active_alerts_count} active alerts`}>{p.active_alerts_count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
