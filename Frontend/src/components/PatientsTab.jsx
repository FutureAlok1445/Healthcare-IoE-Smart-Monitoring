import { IconUsers, IconActivity } from './Icons';

export default function PatientsTab({ patients, selectedPatientId, onSelectPatient }) {
  return (
    <div className="tab-container patients-tab">
      <div className="tab-header-banner">
        <div>
          <h2>Hospital Ward Directory</h2>
          <p className="tab-subtitle">
            Centralized registry of remote monitoring sensor nodes and bed assignments
          </p>
        </div>
        <div className="tab-header-stat">
          <IconUsers size={20} color="#2563eb" />
          <span><strong>{patients.length}</strong> Registered Inpatients</span>
        </div>
      </div>

      <div className="patients-grid-cards">
        {patients.map((p) => {
          const isSelected = p.id === selectedPatientId;
          const status = p.connection_status || (p.isLiveNode ? 'ONLINE' : 'OFFLINE');
          const latest = p.latest_reading;
          const activeAlerts = p.active_alerts_count || 0;

          return (
            <div
              key={p.id}
              className={`patient-directory-card ${isSelected ? 'selected-card' : ''}`}
            >
              <div className="dir-card-header">
                <div>
                  <h3 className="dir-patient-name">{p.name}</h3>
                  <span className="dir-room-tag">Room {p.room || `PT-014${p.id}`}</span>
                </div>
                <span className={`status-pill ${status.toLowerCase()}`}>
                  <span className="status-indicator-dot" />
                  {status}
                </span>
              </div>

              <div className="dir-card-body">
                <div className="dir-info-row">
                  <span className="dir-lbl">Wearable Node:</span>
                  <span className="dir-val"><code>{p.device_id}</code></span>
                </div>

                <div className="dir-vitals-preview">
                  <div className="mini-vital">
                    <span className="mini-lbl">HR</span>
                    <span className="mini-val">
                      {latest?.heart_rate ? `${latest.heart_rate.toFixed(0)} bpm` : '—'}
                    </span>
                  </div>
                  <div className="mini-vital">
                    <span className="mini-lbl">SpO2</span>
                    <span className="mini-val">
                      {latest?.spo2 ? `${latest.spo2.toFixed(0)}%` : '—'}
                    </span>
                  </div>
                  <div className="mini-vital">
                    <span className="mini-lbl">Temp</span>
                    <span className="mini-val">
                      {latest?.temperature ? `${latest.temperature.toFixed(1)}°C` : '—'}
                    </span>
                  </div>
                </div>

                <div className="dir-thresholds-summary">
                  <span>Thresholds: </span>
                  <small>
                    HR {p.thresholds?.hr_min || 50}-{p.thresholds?.hr_max || 120} bpm • SpO2 ≥{p.thresholds?.spo2_min || 92}%
                  </small>
                </div>

                {activeAlerts > 0 && (
                  <div className="dir-active-alert-strip">
                    <span>{activeAlerts} Active Alert(s) Unacknowledged</span>
                  </div>
                )}
              </div>

              <div className="dir-card-footer">
                <button
                  type="button"
                  className={`dir-select-btn ${isSelected ? 'btn-active' : ''}`}
                  onClick={() => onSelectPatient(p.id)}
                >
                  <IconActivity size={14} />
                  <span>{isSelected ? 'Currently Selected' : 'Monitor Patient'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
