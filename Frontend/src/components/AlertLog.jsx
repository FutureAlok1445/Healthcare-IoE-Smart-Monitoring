export default function AlertLog({ alerts, onAcknowledge }) {
  if (!alerts.length) {
    return <p className="empty-msg">No alerts yet — all readings normal.</p>;
  }

  return (
    <ul className="alert-list">
      {alerts.map((a) => (
        <li key={a.id} className={`alert-item level-${a.level.toLowerCase()}`}>
          <div>
            <span className="alert-level">{a.level}</span>
            <span className="alert-message">{a.message}</span>
            <span className="alert-time">
              {new Date(a.created_at).toLocaleTimeString()}
            </span>
          </div>
          {!a.acknowledged && (
            <button className="ack-btn" onClick={() => onAcknowledge(a.id)}>
              Acknowledge
            </button>
          )}
          {a.acknowledged && <span className="ack-badge">Acknowledged</span>}
        </li>
      ))}
    </ul>
  );
}
