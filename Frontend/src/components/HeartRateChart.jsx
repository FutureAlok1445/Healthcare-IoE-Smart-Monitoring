import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function HeartRateChart({ vitals }) {
  // Oldest -> newest, last 20 points, for a left-to-right trend line
  const data = [...vitals]
    .slice(0, 20)
    .reverse()
    .map((v) => ({
      time: new Date(v.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      heartRate: v.heart_rate,
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
        <YAxis domain={[40, 160]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="heartRate" stroke="#2563eb" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
