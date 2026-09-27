export default function HistoryTable({ vitals }) {
  return (
    <table className="history-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>HR (bpm)</th>
          <th>SpO2 (%)</th>
          <th>Temp (C)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {vitals.slice(0, 8).map((v) => (
          <tr key={v.id} className={`row-${v.state.toLowerCase()}`}>
            <td>{new Date(v.received_at).toLocaleTimeString()}</td>
            <td>{v.heart_rate.toFixed(1)}</td>
            <td>{v.spo2.toFixed(1)}</td>
            <td>{v.temperature.toFixed(2)}</td>
            <td>{v.state}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
