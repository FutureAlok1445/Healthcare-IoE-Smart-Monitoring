import React, { useState, useEffect } from 'react';
import {
  IconAlertOctagon,
  IconX,
  IconPhoneCall,
  IconActivity,
  IconCheck,
  IconClock,
  IconShieldCheck,
} from './Icons';

export default function EmergencyModal({
  alert: emergencyAlert,
  patient,
  onClose,
  onAcknowledge,
  onViewVitals,
}) {
  const [callInitiated, setCallInitiated] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!emergencyAlert) return null;

  const reading = emergencyAlert.reading || {};

  const handleCall = () => {
    setCallInitiated(true);
  };

  const hrVal = reading.heart_rate != null ? Number(reading.heart_rate) : null;
  const spo2Val = reading.spo2 != null ? Number(reading.spo2) : null;
  const tempVal = reading.temperature != null ? Number(reading.temperature) : null;
  const motionVal = reading.motion_flag;

  return (
    <div
      className="emergency-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-dialog-title"
    >
      <div className="emergency-dialog-card">
        {/* Modal Close Button */}
        <button
          type="button"
          className="emergency-close-btn"
          onClick={onClose}
          aria-label="Close emergency modal"
        >
          <IconX size={18} />
        </button>

        {/* Pulsing Emergency Header */}
        <div className="emergency-header-strip">
          <div className="emergency-icon-halo">
            <IconAlertOctagon size={28} color="#ffffff" />
          </div>
          <div className="emergency-title-cluster">
            <div className="code-blue-tag">
              <span className="code-blue-dot" />
              <span>CODE BLUE / EMERGENCY DISPATCH</span>
            </div>
            <h2 id="emergency-dialog-title">Critical Physiological Breach Detected</h2>
            <span className="elapsed-counter tabular-nums">
              <IconClock size={12} />
              <span>Elapsed Critical Time: {elapsedSec}s</span>
            </span>
          </div>
        </div>

        {/* Patient Identity Block */}
        <div className="emergency-patient-card">
          <div className="patient-id-col">
            <span className="emergency-patient-name">{patient?.name || 'Patient'}</span>
            <span className="emergency-patient-bed">
              Ward A Inpatient Care • Bed {patient?.room || patient?.id || '—'}
            </span>
          </div>
          <div className="emergency-channel-badge">
            <IconShieldCheck size={14} />
            <span>Cellular & Hospital Pager Broadcast Sent</span>
          </div>
        </div>

        {/* Breached Vitals Readout Grid */}
        <div className="emergency-vitals-grid">
          {/* HR */}
          <div className={`vital-breach-box ${hrVal != null && hrVal > 120 ? 'box-breached' : ''}`}>
            <span className="vital-breach-label">Heart Rate</span>
            <div className="vital-breach-reading">
              <span className="breach-val tabular-nums">{hrVal != null ? hrVal.toFixed(0) : '—'}</span>
              <span className="breach-unit">BPM</span>
            </div>
            <span className="breach-boundary">Threshold: &gt;120 BPM</span>
          </div>

          {/* SpO2 */}
          <div className={`vital-breach-box ${spo2Val != null && spo2Val < 92 ? 'box-breached' : ''}`}>
            <span className="vital-breach-label">Blood Oxygen (SpO2)</span>
            <div className="vital-breach-reading">
              <span className="breach-val tabular-nums">{spo2Val != null ? spo2Val.toFixed(1) : '—'}</span>
              <span className="breach-unit">%</span>
            </div>
            <span className="breach-boundary">Critical Limit: &lt;92%</span>
          </div>

          {/* Temp */}
          <div className={`vital-breach-box ${tempVal != null && tempVal > 38.5 ? 'box-breached' : ''}`}>
            <span className="vital-breach-label">Skin Temperature</span>
            <div className="vital-breach-reading">
              <span className="breach-val tabular-nums">{tempVal != null ? tempVal.toFixed(1) : '—'}</span>
              <span className="breach-unit">°C</span>
            </div>
            <span className="breach-boundary">Pyrexia Limit: &gt;38.5°C</span>
          </div>

          {/* Motion */}
          <div className={`vital-breach-box ${motionVal ? 'box-breached' : ''}`}>
            <span className="vital-breach-label">Patient Fall Sensor</span>
            <div className="vital-breach-reading">
              <span className="breach-val motion-val-text">{motionVal ? 'IMPACT' : 'STABLE'}</span>
            </div>
            <span className="breach-boundary">MPU-6050 &gt;2.5G Threshold</span>
          </div>
        </div>

        {/* Emergency Communication Banner */}
        {callInitiated ? (
          <div className="emergency-intercom-active">
            <span className="active-call-pulse" />
            <span>Cellular voice intercom opened with Ward Room {patient?.room || 'PT-0142'}. Attending Physician on speaker.</span>
          </div>
        ) : (
          <div className="emergency-dispatch-summary">
            <span>Automated alert dispatched via SMS, Email, and Push Notification to 2 primary nurses and attending physician.</span>
          </div>
        )}

        {/* Action Triggers */}
        <div className="emergency-actions-row">
          <button
            type="button"
            className="btn-emergency-call"
            onClick={handleCall}
          >
            <IconPhoneCall size={18} />
            <span>{callInitiated ? 'INTERCOM LINK ACTIVE' : 'Initiate Emergency Call / Code Blue'}</span>
          </button>

          <button
            type="button"
            className="btn-view-live-stream"
            onClick={() => {
              if (onViewVitals) onViewVitals();
              onClose();
            }}
          >
            <IconActivity size={18} />
            <span>View Live Vitals</span>
          </button>
        </div>

        {/* Official Acknowledgment & Audit Stamp */}
        <div className="emergency-audit-footer">
          <div className="audit-status-badge">
            <span>Status:</span>
            <strong className={emergencyAlert.acknowledged ? 'text-ok' : 'text-danger'}>
              {emergencyAlert.acknowledged ? 'ACKNOWLEDGED & LOGGED' : 'ACTION REQUIRED'}
            </strong>
          </div>

          {!emergencyAlert.acknowledged ? (
            <button
              type="button"
              className="btn-confirm-ack"
              onClick={() => onAcknowledge(emergencyAlert.id)}
            >
              <IconCheck size={16} />
              <span>Acknowledge & Sign Incident</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-confirm-ack ack-complete"
              onClick={onClose}
            >
              <span>Dismiss Emergency Overlay</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
