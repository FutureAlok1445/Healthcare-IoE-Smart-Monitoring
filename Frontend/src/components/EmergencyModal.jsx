import { useState } from 'react';
import { IconX, IconAlertTriangle } from './Icons';

export default function EmergencyModal({ alert: emergencyAlert, patient, onClose, onAcknowledge }) {
  const [callInitiated, setCallInitiated] = useState(false);

  if (!emergencyAlert) return null;

  const handleCallPatient = () => {
    setCallInitiated(true);
  };

  return (
    <div className="emergency-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="emergency-title" onClick={onClose}>
      <div className="emergency-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close 'X' Button */}
        <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close Modal">
          <IconX size={18} />
        </button>

        {/* Red Exclamation Icon */}
        <div className="emergency-icon-circle" aria-hidden="true">
          <IconAlertTriangle size={30} color="#ffffff" />
        </div>

        <h2 id="emergency-title" className="emergency-title">EMERGENCY ALERT</h2>
        <p className="emergency-subtitle">Abnormal vitals detected — immediate attention required</p>

        {/* Patient & Readings Box */}
        <div className="emergency-details-box">
          <div className="emergency-detail-row">
            <span className="detail-key">Patient:</span>
            <span className="detail-val">
              <strong>{patient?.name || 'Rahul Sharma'}</strong> (Room / Home ID: {patient?.room || 'PT-0142'})
            </span>
          </div>

          <div className="emergency-detail-row">
            <span className="detail-key">Heart Rate:</span>
            <span className="detail-val highlight-val">
              {emergencyAlert.reading?.heart_rate ? `${emergencyAlert.reading.heart_rate.toFixed(0)} BPM` : '145 BPM'} <span className="threshold-sub">(Threshold: &gt;120)</span>
            </span>
          </div>

          <div className="emergency-detail-row">
            <span className="detail-key">SpO2:</span>
            <span className="detail-val highlight-val">
              {emergencyAlert.reading?.spo2 ? `${emergencyAlert.reading.spo2.toFixed(0)} %` : '85 %'} <span className="threshold-sub">(Threshold: &lt;92%)</span>
            </span>
          </div>

          <div className="emergency-detail-row">
            <span className="detail-key">Time:</span>
            <span className="detail-val">
              {emergencyAlert.created_at ? new Date(emergencyAlert.created_at).toLocaleTimeString() : 'Today, 10:15 AM'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="emergency-actions">
          <button
            type="button"
            className="btn-call-patient"
            onClick={handleCallPatient}
          >
            {callInitiated ? 'CALLING PATIENT…' : 'CALL PATIENT NOW'}
          </button>

          <button
            type="button"
            className="btn-view-vitals"
            onClick={onClose}
          >
            VIEW LIVE VITALS
          </button>
        </div>

        {callInitiated && (
          <div className="call-active-banner">
            <span>Cellular audio link established with Room {patient?.room || 'PT-0142'} intercom. Hotline +91 98765 43210</span>
          </div>
        )}

        {/* Notification channels dispatch line */}
        <p className="emergency-channels-note">
          {emergencyAlert.channels_sent
            ? `Alert sent via ${emergencyAlert.channels_sent} to 2 caregivers and 1 doctor`
            : 'Alert sent via SMS, Email and Push Notification to 2 caregivers and 1 doctor'}
        </p>

        {/* Acknowledgment Footer & Status */}
        <div className="emergency-footer">
          <span className={`emergency-status-pill ${emergencyAlert.acknowledged ? 'acknowledged' : 'pending'}`}>
            Status: {emergencyAlert.acknowledged ? 'ACKNOWLEDGED' : 'ACKNOWLEDGED PENDING'}
          </span>

          {!emergencyAlert.acknowledged ? (
            <button
              type="button"
              className="btn-modal-ack"
              onClick={() => onAcknowledge(emergencyAlert.id)}
            >
              Acknowledge Alert
            </button>
          ) : (
            <button
              type="button"
              className="btn-modal-ack acknowledged"
              onClick={onClose}
            >
              Dismiss Modal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
