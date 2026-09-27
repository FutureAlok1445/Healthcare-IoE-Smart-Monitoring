import { useState, useEffect } from 'react';
import { IconSettings, IconCpu, IconActivity, IconCheck, IconAlertTriangle } from './Icons';
import { fetchThresholds, updateThresholds, ingestTelemetry } from '../services/api';

export default function SettingsTab({ patient, onRefreshData }) {
  const [thresholds, setThresholds] = useState({
    hr_min: 50,
    hr_max: 120,
    spo2_min: 92,
    temp_max: 38.5,
  });
  const [saveStatus, setSaveStatus] = useState(null);
  const [simStatus, setSimStatus] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    if (patient?.id) {
      fetchThresholds(patient.id)
        .then((data) => {
          if (data?.thresholds) {
            setThresholds((prev) => ({ ...prev, ...data.thresholds }));
          }
        })
        .catch(() => {
          // Keep defaults
        });
    }
  }, [patient]);

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    setSaveStatus('Saving...');
    try {
      await updateThresholds(patient.id, thresholds);
      setSaveStatus('Thresholds updated successfully!');
      setTimeout(() => setSaveStatus(null), 3500);
      onRefreshData();
    } catch {
      setSaveStatus('Failed to update thresholds.');
    }
  };

  const handleInjectTelemetry = async (scenario) => {
    setSimLoading(true);
    setSimStatus(`Injecting ${scenario} telemetry packet...`);

    let payload = {
      device_id: patient?.device_id || 'ESP32_NODE_01',
      heart_rate: 72.0,
      spo2: 98.0,
      temperature: 36.6,
      motion_flag: false,
      sos_pressed: false,
      state: 'NORMAL',
      timestamp: Date.now() % 4000000000,
    };

    if (scenario === 'Normal') {
      payload = { ...payload, heart_rate: 74.0, spo2: 98.0, temperature: 36.7, state: 'NORMAL' };
    } else if (scenario === 'Tachycardia') {
      payload = { ...payload, heart_rate: 138.0, spo2: 96.0, temperature: 37.1, state: 'CRITICAL' };
    } else if (scenario === 'Hypoxia') {
      payload = { ...payload, heart_rate: 92.0, spo2: 86.0, temperature: 36.8, state: 'CRITICAL' };
    } else if (scenario === 'High Fever') {
      payload = { ...payload, heart_rate: 104.0, spo2: 95.0, temperature: 39.4, state: 'CRITICAL' };
    } else if (scenario === 'Fall Impact') {
      payload = { ...payload, heart_rate: 118.0, spo2: 94.0, temperature: 36.9, motion_flag: true, state: 'CRITICAL' };
    } else if (scenario === 'SOS Panic') {
      payload = { ...payload, heart_rate: 125.0, spo2: 93.0, temperature: 37.0, sos_pressed: true, state: 'CRITICAL' };
    }

    try {
      const res = await ingestTelemetry(payload);
      setSimStatus(`Packet ingested: State=${res.state}, ID=${res.id} (Status: 201 Created)`);
      setTimeout(() => setSimStatus(null), 4000);
      onRefreshData();
    } catch {
      setSimStatus('Simulation injection failed — check backend connection.');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="tab-container settings-tab">
      <div className="tab-header-banner">
        <div>
          <h2>System Configuration & Ingestion Controls</h2>
          <p className="tab-subtitle">
            Configure clinical vital thresholds and manage telemetry simulation modes
          </p>
        </div>
      </div>

      <div className="settings-two-col-grid">
        {/* Left Column: Clinical Thresholds Form */}
        <div className="settings-panel">
          <div className="panel-header">
            <div className="panel-title-with-icon">
              <IconSettings size={18} color="#2563eb" />
              <h3>Clinical Thresholds — {patient?.name}</h3>
            </div>
            <span className="panel-tag">{patient?.device_id}</span>
          </div>

          <form onSubmit={handleSaveThresholds} className="thresholds-form">
            <div className="form-group-grid">
              <div className="threshold-field">
                <label htmlFor="hr_min">Min Heart Rate (BPM)</label>
                <input
                  id="hr_min"
                  type="number"
                  value={thresholds.hr_min}
                  onChange={(e) => setThresholds({ ...thresholds, hr_min: Number(e.target.value) })}
                />
                <small className="field-hint">Triggers bradycardia alarm below this level</small>
              </div>

              <div className="threshold-field">
                <label htmlFor="hr_max">Max Heart Rate (BPM)</label>
                <input
                  id="hr_max"
                  type="number"
                  value={thresholds.hr_max}
                  onChange={(e) => setThresholds({ ...thresholds, hr_max: Number(e.target.value) })}
                />
                <small className="field-hint">Triggers tachycardia alarm above this level</small>
              </div>

              <div className="threshold-field">
                <label htmlFor="spo2_min">Min SpO2 (%)</label>
                <input
                  id="spo2_min"
                  type="number"
                  value={thresholds.spo2_min}
                  onChange={(e) => setThresholds({ ...thresholds, spo2_min: Number(e.target.value) })}
                />
                <small className="field-hint">Hypoxemia emergency threshold (default 92%)</small>
              </div>

              <div className="threshold-field">
                <label htmlFor="temp_max">Max Temperature (°C)</label>
                <input
                  id="temp_max"
                  type="number"
                  step="0.1"
                  value={thresholds.temp_max}
                  onChange={(e) => setThresholds({ ...thresholds, temp_max: Number(e.target.value) })}
                />
                <small className="field-hint">Pyrexia / hyperthermia alert limit</small>
              </div>
            </div>

            <div className="form-actions-row">
              <button type="submit" className="btn-save-thresholds">
                <IconCheck size={16} />
                <span>Save Clinical Thresholds</span>
              </button>
              {saveStatus && <span className="save-status-msg">{saveStatus}</span>}
            </div>
          </form>
        </div>

        {/* Right Column: Hardware Telemetry Simulator */}
        <div className="settings-panel">
          <div className="panel-header">
            <div className="panel-title-with-icon">
              <IconCpu size={18} color="#2563eb" />
              <h3>Integrated Hardware Telemetry Simulator</h3>
            </div>
            <span className="live-hardware-tag">SIMULATOR</span>
          </div>

          <p className="sim-description">
            Inject synthetic telemetry packets into <code>POST /api/v1/vitals/</code> using the exact same JSON schema sent by the ESP32 firmware.
          </p>

          <div className="simulator-button-grid">
            <button
              type="button"
              className="sim-btn sim-btn-normal"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('Normal')}
            >
              <IconActivity size={14} />
              <span>Normal Vitals (74 BPM, 98% SpO2)</span>
            </button>

            <button
              type="button"
              className="sim-btn sim-btn-warning"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('Tachycardia')}
            >
              <IconAlertTriangle size={14} />
              <span>Tachycardia Spike (138 BPM)</span>
            </button>

            <button
              type="button"
              className="sim-btn sim-btn-danger"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('Hypoxia')}
            >
              <IconAlertTriangle size={14} />
              <span>Severe Hypoxia (86% SpO2)</span>
            </button>

            <button
              type="button"
              className="sim-btn sim-btn-warning"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('High Fever')}
            >
              <IconAlertTriangle size={14} />
              <span>High Fever (39.4°C)</span>
            </button>

            <button
              type="button"
              className="sim-btn sim-btn-danger"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('Fall Impact')}
            >
              <IconAlertTriangle size={14} />
              <span>Kinetic Fall Impact (MPU6050)</span>
            </button>

            <button
              type="button"
              className="sim-btn sim-btn-danger"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('SOS Panic')}
            >
              <IconAlertTriangle size={14} />
              <span>SOS Emergency Button Latched</span>
            </button>
          </div>

          {simStatus && (
            <div className="sim-feedback-box">
              <code>{simStatus}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
