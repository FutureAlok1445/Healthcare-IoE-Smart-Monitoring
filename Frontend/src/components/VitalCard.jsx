export default function VitalCard({ label, value, unit, normalRange, statusColor }) {
  return (
    <div className="vital-card" style={{ borderTopColor: statusColor }}>
      <span className="vital-dot" style={{ backgroundColor: statusColor }} />
      <div className="vital-label">{label}</div>
      <div className="vital-value">
        {value}
        <span className="vital-unit">{unit}</span>
      </div>
      <div className="vital-range">Normal {normalRange}</div>
    </div>
  );
}
