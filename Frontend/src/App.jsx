import { useEffect, useState, useCallback } from 'react';
import VitalCard from './components/VitalCard';
import AlertLog from './components/AlertLog';
import HistoryTable from './components/HistoryTable';
import HeartRateChart from './components/HeartRateChart';
import { fetchVitals, fetchAlerts, acknowledgeAlert } from './services/api';
import './App.css';

// Thresholds mirrored exactly from the ESP32 firmware (main.cpp) so the
// dashboard's color-coding always matches the device's own decision.
function statusColor(value, breach) {
  return breach(value) ? '#dc2626' : '#16a34a';
}

export default function App() {
  const [vitals, setVitals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connError, setConnError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [v, a] = await Promise.all([fetchVitals(), fetchAlerts()]);
      setVitals(v);
      setAlerts(a);
      setConnError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Backend connection error:', err);
      setConnError('Cannot reach backend — is the Django server running?');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      try {
        const [v, a] = await Promise.all([fetchVitals(), fetchAlerts()]);
        if (isMounted) {
          setVitals(v);
          setAlerts(a);
          setConnError(null);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (isMounted) {
          console.error('Backend connection error:', err);
          setConnError('Cannot reach backend — is the Django server running?');
        }
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAcknowledge = async (id) => {
    await acknowledgeAlert(id);
    loadData();
  };

  const latest = vitals[0];

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>CareSense IoE</h1>
        <span className="subtitle">Remote patient monitoring dashboard</span>
        {lastUpdated && (
          <span className="last-updated">
            Last updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </header>

      {connError && <div className="conn-error">{connError}</div>}

      {!connError && !latest && (
        <p className="empty-msg">
          Waiting for the first reading from the ESP32 node…
        </p>
      )}

      {latest && (
        <>
          <section className="vitals-grid">
            <VitalCard
              label="Heart rate"
              value={latest.heart_rate.toFixed(1)}
              unit="bpm"
              normalRange="60-100"
              statusColor={statusColor(latest.heart_rate, (v) => v < 50 || v > 120)}
            />
            <VitalCard
              label="SpO2"
              value={latest.spo2.toFixed(1)}
              unit="%"
              normalRange="≥95"
              statusColor={statusColor(latest.spo2, (v) => v < 92)}
            />
            <VitalCard
              label="Temperature"
              value={latest.temperature.toFixed(2)}
              unit="C"
              normalRange="36.1-37.2"
              statusColor={statusColor(latest.temperature, (v) => v > 38.5)}
            />
            <VitalCard
              label="Motion / fall"
              value={latest.motion_flag ? 'Fall detected' : 'Stable'}
              unit=""
              normalRange="no fall"
              statusColor={latest.motion_flag ? '#dc2626' : '#16a34a'}
            />
          </section>

          <section className="panel">
            <h2>Heart rate — recent trend</h2>
            <HeartRateChart vitals={vitals} />
          </section>

          <div className="two-col">
            <section className="panel">
              <h2>Alert log</h2>
              <AlertLog alerts={alerts} onAcknowledge={handleAcknowledge} />
            </section>

            <section className="panel">
              <h2>Recent readings</h2>
              <HistoryTable vitals={vitals} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
