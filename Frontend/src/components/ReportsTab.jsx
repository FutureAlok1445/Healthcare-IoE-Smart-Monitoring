import { IconFileText } from './Icons';

export default function ReportsTab({ patient, vitals, alerts }) {
  const hrValues = vitals.map((v) => v.heart_rate).filter(Boolean);
  const spo2Values = vitals.map((v) => v.spo2).filter(Boolean);
  const tempValues = vitals.map((v) => v.temperature).filter(Boolean);

  const meanHr = hrValues.length ? (hrValues.reduce((a, b) => a + b, 0) / hrValues.length).toFixed(1) : '—';
  const minSpo2 = spo2Values.length ? Math.min(...spo2Values).toFixed(1) : '—';
  const maxTemp = tempValues.length ? Math.max(...tempValues).toFixed(1) : '—';
  const totalFalls = vitals.filter((v) => v.motion_flag).length;
  const criticalCount = alerts.filter((a) => a.level === 'CRITICAL').length;

  const handleExportCSV = () => {
    if (!vitals.length) {
      window.alert('No vitals data available to export.');
      return;
    }
    const headers = ['Timestamp', 'Device_ID', 'Heart_Rate_BPM', 'SpO2_Percent', 'Temp_C', 'Motion_Flag', 'SOS_Pressed', 'State'];
    const rows = vitals.map((v) => [
      v.received_at,
      v.device_id || patient?.device_id,
      v.heart_rate,
      v.spo2,
      v.temperature,
      v.motion_flag,
      v.sos_pressed,
      v.state,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `caresense_${patient?.device_id || 'patient'}_vitals_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tab-container reports-tab">
      <div className="tab-header-banner">
        <div>
          <h2>Physician Clinical Shift Summary</h2>
          <p className="tab-subtitle">
            Automated handoff report for {patient?.name} (Room {patient?.room || 'PT-0142'})
          </p>
        </div>
        <button type="button" className="btn-export-csv" onClick={handleExportCSV}>
          <IconFileText size={16} />
          <span>Export Clinical CSV</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="report-summary-grid">
        <div className="report-stat-card">
          <span className="rep-stat-lbl">Mean Heart Rate</span>
          <span className="rep-stat-num">{meanHr} <small>BPM</small></span>
          <span className="rep-stat-sub">Normal target: 60-100</span>
        </div>
        <div className="report-stat-card">
          <span className="rep-stat-lbl">Minimum SpO2</span>
          <span className="rep-stat-num">{minSpo2} <small>%</small></span>
          <span className="rep-stat-sub">Desaturation floor</span>
        </div>
        <div className="report-stat-card">
          <span className="rep-stat-lbl">Peak Temperature</span>
          <span className="rep-stat-num">{maxTemp} <small>°C</small></span>
          <span className="rep-stat-sub">Fever threshold: 38.5°C</span>
        </div>
        <div className="report-stat-card">
          <span className="rep-stat-lbl">Fall Kinetic Events</span>
          <span className="rep-stat-num">{totalFalls}</span>
          <span className="rep-stat-sub">MPU6050 vector triggers</span>
        </div>
        <div className="report-stat-card">
          <span className="rep-stat-lbl">Critical Escalations</span>
          <span className="rep-stat-num">{criticalCount}</span>
          <span className="rep-stat-sub">Multi-channel dispatches</span>
        </div>
      </div>

      {/* Clinical Notes & Shift Assessment */}
      <section className="clinical-notes-panel">
        <div className="panel-header">
          <h3>Physician Handoff & Protocol Assessment</h3>
          <span className="panel-tag">CareSense Protocol v2.4</span>
        </div>
        <div className="notes-body">
          <p>
            <strong>Biometric Baseline:</strong> Patient {patient?.name} is monitored via continuous ESP32 wearable sensor node <code>{patient?.device_id}</code>.
            Telemetry sampled at 5000ms cycles across dual optical PPG and precision DS18B20 digital thermal probe.
          </p>
          <p>
            <strong>Automated Triage Assessment:</strong> Total telemetry points logged: <strong>{vitals.length}</strong>.
            Alert events recorded: <strong>{alerts.length}</strong>.
            All active breaches are triaged through the CareSense escalation state machine (NORMAL → WATCH → CRITICAL on 3 consecutive breaches or immediate SOS latch).
          </p>
        </div>
      </section>
    </div>
  );
}
