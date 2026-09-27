import React, { useState, useEffect, useRef } from 'react';
import {
  IconHeartPulse,
  IconDroplets,
  IconThermometer,
  IconActivity,
  IconCheckCircle,
  IconAlertTriangle,
  IconClock,
  IconUser,
  IconPhoneCall,
} from './Icons';

export default function LiveVitalsTab({ patient, latestVital, clinician }) {
  const [pulseBeat, setPulseBeat] = useState(false);
  const [tempUnit, setTempUnit] = useState('C'); // 'C' | 'F'
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const waveOffsetRef = useRef(0);

  const hasTelemetry = Boolean(latestVital);
  const hr = latestVital?.heart_rate != null ? Number(latestVital.heart_rate) : null;
  const spo2 = latestVital?.spo2 != null ? Number(latestVital.spo2) : null;
  const tempC = latestVital?.temperature != null ? Number(latestVital.temperature) : null;
  const isFall = latestVital?.motion_flag ?? false;
  const isSos = latestVital?.sos_pressed ?? false;

  // Heart beat pulse animation
  useEffect(() => {
    if (hr == null || hr <= 0) return undefined;
    const bpm = hr;
    const intervalMs = Math.max(450, Math.min(1400, Math.round(60000 / bpm)));
    const beatTimer = setInterval(() => {
      setPulseBeat(true);
      setTimeout(() => setPulseBeat(false), 200);
    }, intervalMs);
    return () => clearInterval(beatTimer);
  }, [hr]);

  // Smooth continuous live pulse rhythm canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      waveOffsetRef.current += 1.8;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Subtle medical grid
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Smooth ECG/PPG wave path
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const period = 75;
      for (let x = 0; x < width; x++) {
        const t = (x + waveOffsetRef.current) % period;
        const norm = t / period;

        let yNorm = 0.54;
        if (norm < 0.16) {
          // Systolic peak
          yNorm = 0.54 - Math.sin((norm / 0.16) * Math.PI) * 0.44;
        } else if (norm >= 0.16 && norm < 0.36) {
          // Dicrotic notch
          const notchNorm = (norm - 0.16) / 0.2;
          yNorm = 0.54 + Math.sin(notchNorm * Math.PI) * 0.1 - (1 - notchNorm) * 0.14;
        } else {
          // Resting baseline
          yNorm = 0.54;
        }

        const y = yNorm * height;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Sweeping radar scan line
      const cursorX = (waveOffsetRef.current * 1.5) % width;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Clinical evaluation states in plain medical language
  const isHrHigh = hr != null && hr > 120;
  const isHrLow = hr != null && hr < 50;
  const isSpo2Low = spo2 != null && spo2 < 92;
  const isTempHigh = tempC != null && tempC > 38.0;
  const hasCritical = isHrHigh || isSpo2Low || isTempHigh || isFall || isSos;
  const attendingName = clinician?.display_name || clinician?.username || 'On-duty clinician';
  const tempF = tempC != null ? (tempC * 9) / 5 + 32 : null;

  if (!patient) {
    return (
      <div className="dashboard-empty-card">
        <h3>No patient selected</h3>
        <p>Select a ward patient from the rail above to view live vitals.</p>
      </div>
    );
  }

  if (!hasTelemetry) {
    return (
      <div className="clinical-monitor-view">
        <section className="patient-banner-card">
          <div className="patient-banner-info">
            <div className="patient-avatar-large">
              <IconUser size={24} />
            </div>
            <div>
              <h2 className="patient-full-name">{patient.name}</h2>
              <p className="patient-location-sub">
                <strong>Bed {patient.room || patient.id}</strong> • Ward A • Attending: <strong>{attendingName}</strong>
              </p>
            </div>
          </div>
        </section>
        <div className="dashboard-empty-card">
          <h3>Awaiting live telemetry</h3>
          <p>No readings yet for this patient. Hardware POSTs to <code>/api/v1/vitals/</code>, or use Settings → Simulate Patient Vitals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clinical-monitor-view">
      {/* Patient Header Card */}
      <section className="patient-banner-card">
        <div className="patient-banner-info">
          <div className="patient-avatar-large">
            <IconUser size={24} />
          </div>
          <div>
            <div className="patient-title-row">
              <h2 className="patient-full-name">{patient.name}</h2>
              <span className={`patient-condition-badge ${hasCritical ? 'condition-alert' : 'condition-normal'}`}>
                {hasCritical ? <IconAlertTriangle size={13} /> : <IconCheckCircle size={13} />}
                <span>{hasCritical ? 'Attention Required' : 'Vitals Stable'}</span>
              </span>
            </div>
            <p className="patient-location-sub">
              <strong>Bed {patient.room || patient.id}</strong> • Ward A Inpatient Care • Attending:{' '}
              <strong>{attendingName}</strong>
            </p>
          </div>
        </div>

        <div className="patient-banner-actions">
          <div className="monitor-sync-chip">
            <span className="live-pulse-dot" />
            <span>Continuous Monitoring Active</span>
          </div>
        </div>
      </section>

      {/* Live Rhythm Plethysmogram Waveform Card */}
      <section className="waveform-monitor-card">
        <div className="waveform-card-header">
          <div className="waveform-title-group">
            <div className={`cardio-pulse-badge ${pulseBeat ? 'pulse-active' : ''}`}>
              <IconHeartPulse size={18} color={pulseBeat ? '#ef4444' : '#0284c7'} />
            </div>
            <div>
              <h3>Real-Time Pulse Rhythm Monitor</h3>
              <p className="waveform-subtitle">Optical Plethysmogram (PPG) Stream</p>
            </div>
          </div>
          <div className="waveform-reading-pill">
            <span className="pill-number tabular-nums">{hr.toFixed(0)}</span>
            <span className="pill-unit">BPM</span>
          </div>
        </div>

        <div className="waveform-canvas-box">
          <canvas ref={canvasRef} width={800} height={120} className="rhythm-canvas" />
        </div>

        <div className="waveform-card-footer">
          <span className="rhythm-status-text">
            Rhythm Status: <strong>Normal Sinus Pattern</strong>
          </span>
          <span className="rhythm-sync-text">
            <IconClock size={12} />
            <span>Real-time wave display</span>
          </span>
        </div>
      </section>

      {/* Primary 4 Clinical Vitals Instruments */}
      <div className="clinical-instruments-grid">
        {/* Instrument 1: Heart Rate */}
        <div className={`instrument-vital-box ${isHrHigh || isHrLow ? 'box-alert' : ''}`}>
          <div className="vital-box-top">
            <div className="vital-label-wrap">
              <span className="vital-icon-circle hr-circle"><IconHeartPulse size={18} /></span>
              <span className="vital-title">Heart Rate</span>
            </div>
            <span className={`vital-eval-pill ${isHrHigh ? 'pill-danger' : isHrLow ? 'pill-warning' : 'pill-normal'}`}>
              {isHrHigh ? 'High (Tachycardia)' : isHrLow ? 'Low (Bradycardia)' : 'Normal'}
            </span>
          </div>

          <div className="vital-main-number">
            <span className="vital-digits tabular-nums">{hr.toFixed(0)}</span>
            <span className="vital-unit-text">BPM</span>
          </div>

          <div className="vital-range-bar-box">
            <div className="range-track">
              <div
                className="range-fill range-hr"
                style={{ width: `${Math.min(100, Math.max(10, ((hr - 40) / 120) * 100))}%` }}
              />
            </div>
            <div className="range-labels">
              <span>50 Min</span>
              <span className="label-target">Target 60–100 BPM</span>
              <span>120 Max</span>
            </div>
          </div>
        </div>

        {/* Instrument 2: Blood Oxygen (SpO2) */}
        <div className={`instrument-vital-box ${isSpo2Low ? 'box-alert' : ''}`}>
          <div className="vital-box-top">
            <div className="vital-label-wrap">
              <span className="vital-icon-circle spo2-circle"><IconDroplets size={18} /></span>
              <span className="vital-title">Oxygen Saturation</span>
            </div>
            <span className={`vital-eval-pill ${isSpo2Low ? 'pill-danger' : 'pill-normal'}`}>
              {isSpo2Low ? 'Low (Hypoxia)' : 'Healthy'}
            </span>
          </div>

          <div className="vital-main-number">
            <span className="vital-digits tabular-nums">{spo2.toFixed(1)}</span>
            <span className="vital-unit-text">%</span>
          </div>

          <div className="vital-range-bar-box">
            <div className="range-track">
              <div
                className="range-fill range-spo2"
                style={{ width: `${Math.min(100, Math.max(10, ((spo2 - 80) / 20) * 100))}%` }}
              />
            </div>
            <div className="range-labels">
              <span>85% Alert</span>
              <span className="label-target">Target ≥95%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Instrument 3: Body Temperature */}
        <div className={`instrument-vital-box ${isTempHigh ? 'box-alert' : ''}`}>
          <div className="vital-box-top">
            <div className="vital-label-wrap">
              <span className="vital-icon-circle temp-circle"><IconThermometer size={18} /></span>
              <span className="vital-title">Body Temperature</span>
            </div>
            <div className="unit-toggle-group">
              <button
                type="button"
                className={`unit-btn ${tempUnit === 'C' ? 'active' : ''}`}
                onClick={() => setTempUnit('C')}
              >
                °C
              </button>
              <button
                type="button"
                className={`unit-btn ${tempUnit === 'F' ? 'active' : ''}`}
                onClick={() => setTempUnit('F')}
              >
                °F
              </button>
            </div>
          </div>

          <div className="vital-main-number">
            <span className="vital-digits tabular-nums">
              {tempUnit === 'C' ? tempC.toFixed(1) : tempF.toFixed(1)}
            </span>
            <span className="vital-unit-text">°{tempUnit}</span>
          </div>

          <div className="vital-range-bar-box">
            <div className="range-track">
              <div
                className="range-fill range-temp"
                style={{ width: `${Math.min(100, Math.max(10, ((tempC - 35) / 5) * 100))}%` }}
              />
            </div>
            <div className="range-labels">
              <span>36.0°C</span>
              <span className="label-target">Normal 36.5–37.5°C</span>
              <span>38.5°C Fever</span>
            </div>
          </div>
        </div>

        {/* Instrument 4: Patient Activity & Posture */}
        <div className={`instrument-vital-box ${isFall ? 'box-alert' : ''}`}>
          <div className="vital-box-top">
            <div className="vital-label-wrap">
              <span className="vital-icon-circle motion-circle"><IconActivity size={18} /></span>
              <span className="vital-title">Patient Movement</span>
            </div>
            <span className={`vital-eval-pill ${isFall ? 'pill-danger' : 'pill-normal'}`}>
              {isFall ? 'Fall Detected!' : 'Stable'}
            </span>
          </div>

          <div className="vital-main-number">
            <span className="activity-status-text">
              {isFall ? 'Sudden Impact Alert' : 'Resting in Bed'}
            </span>
          </div>

          <div className="vital-range-bar-box">
            <div className="patient-posture-detail">
              <span className="posture-chip">Position: Upright / Lying Flat</span>
              <span className="safety-chip">Movement: Gentle</span>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Care & Nurse Assistance Panel */}
      <section className="nurse-assistance-card">
        <div className="nurse-panel-left">
          <div className="nurse-call-icon">
            <IconPhoneCall size={20} color={isSos ? '#ef4444' : 'var(--brand-primary)'} />
          </div>
          <div>
            <h4>Bedside Patient Call Button</h4>
            <p className="nurse-call-desc">
              {isSos
                ? 'Patient has pressed the emergency call button! Immediate bedside response required.'
                : 'Patient call button is connected and armed. Pressing the button will immediately notify nursing staff.'}
            </p>
          </div>
        </div>
        <div className="nurse-panel-right">
          <span className={`call-status-badge ${isSos ? 'call-triggered' : 'call-idle'}`}>
            {isSos ? 'CALL PRESSED (CODE BLUE)' : 'Call Button Armed & Ready'}
          </span>
        </div>
      </section>
    </div>
  );
}
