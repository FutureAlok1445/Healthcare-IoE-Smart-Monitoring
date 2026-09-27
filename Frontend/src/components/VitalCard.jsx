import React from 'react';
import Sparkline from './Sparkline';
import {
  IconHeartPulse,
  IconDroplets,
  IconThermometer,
  IconActivity,
  IconAlertTriangle,
  IconCheckCircle,
} from './Icons';

export default function VitalCard({
  label,
  value,
  unit,
  normalRange,
  statusType = 'ok', // 'ok' | 'watch' | 'danger'
  sparklineData = [],
  metricKey = 'hr',
  isMotionCard = false,
  motionFlag = false,
  accelMagnitude = 1.02,
}) {
  const isAlarm = statusType === 'danger' || motionFlag;
  const isWatch = statusType === 'watch';

  // Icon mapping
  const renderIcon = () => {
    switch (metricKey) {
      case 'hr':
        return <IconHeartPulse size={18} className="vital-icon hr-icon" />;
      case 'spo2':
        return <IconDroplets size={18} className="vital-icon spo2-icon" />;
      case 'temp':
        return <IconThermometer size={18} className="vital-icon temp-icon" />;
      case 'motion':
        return <IconActivity size={18} className="vital-icon motion-icon" />;
      default:
        return <IconHeartPulse size={18} className="vital-icon" />;
    }
  };

  const statusLabel = isAlarm ? 'Critical' : isWatch ? 'Watch' : 'Normal';
  const statusClass = isAlarm ? 'status-pill-danger' : isWatch ? 'status-pill-warning' : 'status-pill-ok';
  const sparkColor = isAlarm ? '#dc2626' : isWatch ? '#d97706' : '#0284c7';

  // Motion card specific layout
  if (isMotionCard) {
    const gMagnitude = typeof accelMagnitude === 'number' ? accelMagnitude : 1.0;
    const gPercent = Math.min(100, Math.max(8, (gMagnitude / 3.0) * 100));
    const isFall = motionFlag || gMagnitude >= 2.5;

    return (
      <div className={`clinical-kpi-card ${isFall ? 'card-breached' : ''}`}>
        <div className="kpi-card-header">
          <div className="kpi-title-cluster">
            <span className="kpi-icon-wrap motion-icon-wrap">{renderIcon()}</span>
            <span className="kpi-label">{label}</span>
          </div>
          <span className={`kpi-status-pill ${isFall ? 'status-pill-danger pulse-emergency' : 'status-pill-ok'}`}>
            {isFall ? <IconAlertTriangle size={12} /> : <IconCheckCircle size={12} />}
            <span>{isFall ? 'Fall Impact Alert' : 'Bed Stable'}</span>
          </span>
        </div>

        <div className="kpi-reading-row">
          <div className="kpi-reading-block">
            <span className="kpi-value-num tabular-nums">
              {gMagnitude.toFixed(2)}
            </span>
            <span className="kpi-unit-label">Activity (G)</span>
          </div>

          <div className="kpi-motion-spark">
            <Sparkline data={sparklineData} color={isFall ? '#dc2626' : '#059669'} width={88} height={26} />
          </div>
        </div>

        {/* 3-Axis Fall Threshold Bar Gauge */}
        <div className="kpi-motion-bar-container">
          <div className="kpi-motion-bar-track">
            <div
              className={`kpi-motion-bar-fill ${isFall ? 'bar-danger' : 'bar-normal'}`}
              style={{ width: `${gPercent}%` }}
            />
            {/* 2.5G Threshold Tick */}
            <div className="kpi-threshold-marker" style={{ left: `${(2.5 / 3.0) * 100}%` }} title="2.50G Fall Impact Boundary" />
          </div>
          <div className="kpi-motion-bar-labels">
            <span>0G</span>
            <span className="tick-25g">Impact Limit 2.5G</span>
            <span>3.0G</span>
          </div>
        </div>

        <div className="kpi-card-footer">
          <span className="kpi-range-footnote">Continuous Bed Fall & Posture Monitor Active</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`clinical-kpi-card ${isAlarm ? 'card-breached' : ''}`}>
      <div className="kpi-card-header">
        <div className="kpi-title-cluster">
          <span className={`kpi-icon-wrap ${metricKey}-icon-wrap`}>{renderIcon()}</span>
          <span className="kpi-label">{label}</span>
        </div>
        <span className={`kpi-status-pill ${statusClass}`}>
          {isAlarm ? <IconAlertTriangle size={12} /> : <IconCheckCircle size={12} />}
          <span>{statusLabel}</span>
        </span>
      </div>

      <div className="kpi-reading-row">
        <div className="kpi-reading-block">
          <span className="kpi-value-num tabular-nums">{value}</span>
          <span className="kpi-unit-label">{unit}</span>
        </div>

        <div className="kpi-spark-wrap">
          <Sparkline data={sparklineData} color={sparkColor} width={88} height={26} />
        </div>
      </div>

      <div className="kpi-card-footer">
        <span className="kpi-range-footnote">{normalRange}</span>
      </div>
    </div>
  );
}
