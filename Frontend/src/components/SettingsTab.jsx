import React, { useState, useEffect } from 'react';
import {
  IconSettings,
  IconCheck,
  IconAlertTriangle,
  IconShieldCheck,
  IconHeartPulse,
  IconDroplets,
  IconThermometer,
  IconCheckCircle,
  IconActivity,
  IconPhoneCall,
  IconBellRing,
} from './Icons';
import { fetchThresholds, updateThresholds, ingestTelemetry } from '../services/api';

export default function SettingsTab({ patient, onRefreshData, user }) {
  const [initialThresholds, setInitialThresholds] = useState({
    hr_min: 50,
    hr_max: 120,
    spo2_min: 92,
    temp_max: 38.5,
  });

  const [thresholds, setThresholds] = useState({
    hr_min: 50,
    hr_max: 120,
    spo2_min: 92,
    temp_max: 38.5,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [simStatus, setSimStatus] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Ward Notification Toggles
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [smsDispatch, setSmsDispatch] = useState(true);

  const canEditThresholds = user?.permissions?.can_update_thresholds ?? (user?.role !== 'NURSE');

  useEffect(() => {
    if (patient?.id) {
      fetchThresholds(patient.id)
        .then((data) => {
          if (data?.thresholds) {
            setThresholds((prev) => ({ ...prev, ...data.thresholds }));
            setInitialThresholds((prev) => ({ ...prev, ...data.thresholds }));
            setIsDirty(false);
          }
        })
        .catch(() => {
          // Keep defaults
        });
    }
  }, [patient]);

  const handleChange = (key, val) => {
    setThresholds((prev) => {
      const updated = { ...prev, [key]: val };
      const dirty =
        updated.hr_min !== initialThresholds.hr_min ||
        updated.hr_max !== initialThresholds.hr_max ||
        updated.spo2_min !== initialThresholds.spo2_min ||
        updated.temp_max !== initialThresholds.temp_max;
      setIsDirty(dirty);
      return updated;
    });
  };

  const handleDiscard = () => {
    setThresholds(initialThresholds);
    setIsDirty(false);
    setSaveStatus(null);
  };

  const handleSaveThresholds = async (e) => {
    if (e) e.preventDefault();
    if (!canEditThresholds) {
      setSaveStatus('Error: Nurse/Caregiver account has read-only access. Physician authorization required.');
      return;
    }
    setSaveStatus('Saving clinical thresholds…');
    try {
      await updateThresholds(patient.id, thresholds);
      setInitialThresholds(thresholds);
      setIsDirty(false);
      setSaveStatus('Clinical thresholds updated and active for this patient.');
      setTimeout(() => setSaveStatus(null), 4000);
      onRefreshData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update thresholds.';
      setSaveStatus(`Error: ${msg}`);
    }
  };

  const handleInjectTelemetry = async (scenario) => {
    setSimLoading(true);
    setSimStatus(`Simulating ${scenario} event…`);

    const jitter = (Math.random() - 0.5) * 1.2;

    let payload = {
      device_id: patient?.device_id || 'ESP32_NODE_01',
      heart_rate: +(74.0 + jitter).toFixed(1),
      spo2: +(98.5 + (Math.random() - 0.5) * 0.4).toFixed(1),
      temperature: +(36.75 + (Math.random() - 0.5) * 0.1).toFixed(2),
      motion_flag: false,
      sos_pressed: false,
      state: 'NORMAL',
      source: 'simulation',
      timestamp: Date.now() % 4000000000,
    };

    if (scenario === 'Normal Resting') {
      payload.state = 'NORMAL';
    } else if (scenario === 'Fast Heart Rate') {
      payload.heart_rate = +(138.0 + Math.random() * 8).toFixed(1);
      payload.state = 'CRITICAL';
    } else if (scenario === 'Low Oxygen') {
      payload.spo2 = +(86.5 + Math.random() * 2).toFixed(1);
      payload.state = 'CRITICAL';
    } else if (scenario === 'High Fever') {
      payload.temperature = +(39.4 + Math.random() * 0.3).toFixed(2);
      payload.state = 'CRITICAL';
    } else if (scenario === 'Fall Detected') {
      payload.motion_flag = true;
      payload.heart_rate = 118.0;
      payload.state = 'CRITICAL';
    } else if (scenario === 'Emergency Call') {
      payload.sos_pressed = true;
      payload.heart_rate = 126.0;
      payload.state = 'CRITICAL';
    }

    try {
      await ingestTelemetry(payload);
      setSimStatus(`Test event [${scenario}] sent. Vitals and alert feed updated.`);
      setTimeout(() => setSimStatus(null), 4000);
      onRefreshData();
    } catch (err) {
      setSimStatus(`Simulation failed: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="settings-tab-container">
      {/* Settings Header */}
      <section className="settings-header-banner">
        <div className="settings-title-block">
          <div className="settings-icon-box">
            <IconSettings size={22} color="var(--brand-primary)" />
          </div>
          <div>
            <h2>Patient Alert Limits & Care Preferences</h2>
            <p>
              Set safe physiological boundaries for <strong>{patient?.name}</strong> (Bed {patient?.room}) and customize ward notifications.
            </p>
          </div>
        </div>
      </section>

      {/* Grid of Settings Categories (2-Column Responsive Layout) */}
      <div className="settings-category-grid">
        {/* Category 1: Clinical Safety Thresholds */}
        <div className="settings-card-panel">
          <div className="card-panel-header">
            <div className="panel-title-group">
              <IconHeartPulse size={18} color="var(--brand-primary)" />
              <h3>Biometric Safety Thresholds</h3>
            </div>
            <span className="panel-context-tag">Bed {patient?.room || '101'}</span>
          </div>

          <p className="card-panel-desc">
            If patient vitals move outside these ranges, the system will immediately dispatch visual and audio alerts to on-duty staff.
          </p>

          {!canEditThresholds && (
            <div className="role-lock-callout" role="alert">
              <IconShieldCheck size={16} />
              <span>Read-Only Access: Attending Physician credentials required to edit patient safety thresholds.</span>
            </div>
          )}

          <form onSubmit={handleSaveThresholds} className="settings-form-layout">
            <div className="form-paired-columns">
              {/* Field 1: Min Heart Rate */}
              <div className="form-field-card">
                <label htmlFor="hr_min" className="field-card-label">
                  Low Heart Rate Alert (Bradycardia)
                </label>
                <div className="field-input-wrapper">
                  <input
                    id="hr_min"
                    type="number"
                    value={thresholds.hr_min}
                    onChange={(e) => handleChange('hr_min', Number(e.target.value))}
                    disabled={!canEditThresholds}
                    className="tabular-nums"
                    min="30"
                    max="100"
                    required
                  />
                  <span className="field-unit-suffix">BPM</span>
                </div>
                <span className="field-helper-text">Alerts if pulse drops below this value</span>
              </div>

              {/* Field 2: Max Heart Rate */}
              <div className="form-field-card">
                <label htmlFor="hr_max" className="field-card-label">
                  High Heart Rate Alert (Tachycardia)
                </label>
                <div className="field-input-wrapper">
                  <input
                    id="hr_max"
                    type="number"
                    value={thresholds.hr_max}
                    onChange={(e) => handleChange('hr_max', Number(e.target.value))}
                    disabled={!canEditThresholds}
                    className="tabular-nums"
                    min="80"
                    max="220"
                    required
                  />
                  <span className="field-unit-suffix">BPM</span>
                </div>
                <span className="field-helper-text">Alerts if pulse spikes above this value</span>
              </div>

              {/* Field 3: SpO2 Min */}
              <div className="form-field-card">
                <label htmlFor="spo2_min" className="field-card-label">
                  Low Oxygen Alert Limit (SpO2)
                </label>
                <div className="field-input-wrapper">
                  <input
                    id="spo2_min"
                    type="number"
                    value={thresholds.spo2_min}
                    onChange={(e) => handleChange('spo2_min', Number(e.target.value))}
                    disabled={!canEditThresholds}
                    className="tabular-nums"
                    min="70"
                    max="99"
                    required
                  />
                  <span className="field-unit-suffix">%</span>
                </div>
                <span className="field-helper-text">Normal is ≥95%. Alert triggers below this.</span>
              </div>

              {/* Field 4: Temp Max */}
              <div className="form-field-card">
                <label htmlFor="temp_max" className="field-card-label">
                  High Temperature Alert (Fever)
                </label>
                <div className="field-input-wrapper">
                  <input
                    id="temp_max"
                    type="number"
                    step="0.1"
                    value={thresholds.temp_max}
                    onChange={(e) => handleChange('temp_max', Number(e.target.value))}
                    disabled={!canEditThresholds}
                    className="tabular-nums"
                    min="36.0"
                    max="42.0"
                    required
                  />
                  <span className="field-unit-suffix">°C</span>
                </div>
                <span className="field-helper-text">Alerts if body temperature indicates fever</span>
              </div>
            </div>

            {saveStatus && (
              <div className={`status-toast-bar ${saveStatus.startsWith('Error') ? 'toast-error' : 'toast-success'}`}>
                {saveStatus.startsWith('Error') ? <IconAlertTriangle size={15} /> : <IconCheck size={15} />}
                <span>{saveStatus}</span>
              </div>
            )}
          </form>
        </div>

        {/* Category 2: Ward Notification & Care Preferences */}
        <div className="settings-card-panel">
          <div className="card-panel-header">
            <div className="panel-title-group">
              <IconBellRing size={18} color="var(--brand-primary)" />
              <h3>Ward Notification Settings</h3>
            </div>
            <span className="panel-context-tag">Staff Station</span>
          </div>

          <p className="card-panel-desc">
            Configure how your nursing station receives emergency notifications when a breach occurs.
          </p>

          <div className="notification-options-list">
            <div className="notify-item">
              <div className="notify-text">
                <span className="notify-title">Audible Station Chime</span>
                <span className="notify-sub">Play an audible chime when a critical vital breach is detected</span>
              </div>
              <button
                type="button"
                className={`simple-toggle-btn ${soundAlerts ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => setSoundAlerts(!soundAlerts)}
              >
                {soundAlerts ? 'Enabled' : 'Muted'}
              </button>
            </div>

            <div className="notify-item">
              <div className="notify-text">
                <span className="notify-title">Immediate SMS & Pager Dispatch</span>
                <span className="notify-sub">Automatically notify on-duty caregiver phone on critical emergency</span>
              </div>
              <button
                type="button"
                className={`simple-toggle-btn ${smsDispatch ? 'toggle-on' : 'toggle-off'}`}
                onClick={() => setSmsDispatch(!smsDispatch)}
              >
                {smsDispatch ? 'Enabled' : 'Off'}
              </button>
            </div>

            <div className="notify-item">
              <div className="notify-text">
                <span className="notify-title">Bedside Intercom Hotline</span>
                <span className="notify-sub">Direct audio link to Bed {patient?.room || '101'} intercom for emergencies</span>
              </div>
              <span className="notify-status-active">Connected & Armed</span>
            </div>
          </div>
        </div>

        {/* Category 3: Clinical Test & Training Scenarios (Friendly & Easy) */}
        <div className="settings-card-panel full-span-card">
          <div className="card-panel-header">
            <div className="panel-title-group">
              <IconActivity size={18} color="var(--brand-primary)" />
              <h3>Simulate Patient Vitals (Training & Evaluation)</h3>
            </div>
            <span className="panel-context-tag">Demo & Testing</span>
          </div>

          <p className="card-panel-desc">
            Click any scenario to simulate different patient conditions on the dashboard and observe how the clinical alert system responds.
          </p>

          <div className="scenario-action-cards-grid">
            {/* 1. Normal */}
            <button
              type="button"
              className="scenario-action-card scenario-normal"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('Normal Resting')}
            >
              <div className="scenario-card-top">
                <span className="scenario-icon-box"><IconCheckCircle size={18} /></span>
                <span className="scenario-tag">Nominal</span>
              </div>
              <strong className="scenario-title">Normal Resting State</strong>
              <p className="scenario-meta">Heart Rate 74 BPM • 98.5% SpO2 • 36.8°C Normal</p>
            </button>

            {/* 2. Fast Heart Rate */}
            <button
              type="button"
              className="scenario-action-card scenario-warning"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('Fast Heart Rate')}
            >
              <div className="scenario-card-top">
                <span className="scenario-icon-box"><IconHeartPulse size={18} /></span>
                <span className="scenario-tag">Warning</span>
              </div>
              <strong className="scenario-title">Fast Heart Rate (Tachycardia)</strong>
              <p className="scenario-meta">Heart Rate spikes to 142 BPM (Above safe limit)</p>
            </button>

            {/* 3. Low Oxygen */}
            <button
              type="button"
              className="scenario-action-card scenario-critical"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('Low Oxygen')}
            >
              <div className="scenario-card-top">
                <span className="scenario-icon-box"><IconDroplets size={18} /></span>
                <span className="scenario-tag">Critical</span>
              </div>
              <strong className="scenario-title">Low Oxygen (Hypoxia)</strong>
              <p className="scenario-meta">SpO2 drops to 86.5% (Requires oxygen therapy)</p>
            </button>

            {/* 4. High Fever */}
            <button
              type="button"
              className="scenario-action-card scenario-warning"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('High Fever')}
            >
              <div className="scenario-card-top">
                <span className="scenario-icon-box"><IconThermometer size={18} /></span>
                <span className="scenario-tag">Warning</span>
              </div>
              <strong className="scenario-title">High Fever (Pyrexia)</strong>
              <p className="scenario-meta">Body temperature surges to 39.4°C</p>
            </button>

            {/* 5. Fall Detected */}
            <button
              type="button"
              className="scenario-action-card scenario-critical"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('Fall Detected')}
            >
              <div className="scenario-card-top">
                <span className="scenario-icon-box"><IconActivity size={18} /></span>
                <span className="scenario-tag">Fall Alert</span>
              </div>
              <strong className="scenario-title">Patient Fall Detected</strong>
              <p className="scenario-meta">Sudden impact detected by bed sensor</p>
            </button>

            {/* 6. Emergency Call Button */}
            <button
              type="button"
              className="scenario-action-card scenario-emergency"
              disabled={simLoading}
              onClick={() => handleInjectTelemetry('Emergency Call')}
            >
              <div className="scenario-card-top">
                <span className="scenario-icon-box"><IconPhoneCall size={18} /></span>
                <span className="scenario-tag">Code Blue</span>
              </div>
              <strong className="scenario-title">Nurse Call Button Pressed</strong>
              <p className="scenario-meta">Patient triggered emergency bedside button</p>
            </button>
          </div>

          {simStatus && (
            <div className="sim-feedback-toast">
              <span className="sim-pulse-dot" />
              <span>{simStatus}</span>
            </div>
          )}
        </div>

        {/* Category 4: Logged-in Clinician Session */}
        <div className="settings-card-panel full-span-card">
          <div className="card-panel-header">
            <div className="panel-title-group">
              <IconShieldCheck size={18} color="var(--brand-primary)" />
              <h3>Current Shift & Clinician Information</h3>
            </div>
            <span className="panel-context-tag">Session Active</span>
          </div>

          <div className="session-audit-grid">
            <div className="audit-col">
              <span className="audit-label">Active Clinician:</span>
              <span className="audit-val">
                <strong>{user?.display_name || user?.name || 'Dr. Mehta'}</strong> ({user?.email})
              </span>
            </div>
            <div className="audit-col">
              <span className="audit-label">Assigned Role:</span>
              <span className="audit-val">
                <span className={`user-role-pill role-badge-${(user?.role || 'DOCTOR').toLowerCase()}`}>
                  {user?.role || 'DOCTOR'}
                </span>
              </span>
            </div>
            <div className="audit-col">
              <span className="audit-label">Safety Threshold Access:</span>
              <span className="audit-val">
                {canEditThresholds ? 'Authorized to Edit' : 'Read-Only (Physician Permission Required)'}
              </span>
            </div>
            <div className="audit-col">
              <span className="audit-label">Ward Assignment:</span>
              <span className="audit-val">Ward A • Central Inpatient Monitoring</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Changes Bar */}
      {isDirty && (
        <div className="floating-save-bar">
          <div className="save-bar-left">
            <IconAlertTriangle size={18} color="var(--brand-primary)" />
            <span>You have unsaved changes to patient safety limits.</span>
          </div>
          <div className="save-bar-right">
            <button type="button" className="btn-save-discard" onClick={handleDiscard}>
              Discard Changes
            </button>
            <button
              type="button"
              className="btn-save-confirm"
              onClick={handleSaveThresholds}
              disabled={!canEditThresholds}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
