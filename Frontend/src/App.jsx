import { useEffect, useState, useCallback } from 'react';
import VitalCard from './components/VitalCard';
import AlertLog from './components/AlertLog';
import HistoryTable from './components/HistoryTable';
import HeartRateChart from './components/HeartRateChart';
import Sidebar from './components/Sidebar';
import PatientSelector from './components/PatientSelector';
import EmergencyModal from './components/EmergencyModal';
import Login from './components/Login';
import { fetchVitals, fetchAlerts, acknowledgeAlert, WARD_PATIENTS } from './services/api';
import './App.css';

function statusColor(value, breach) {
  return breach(value) ? '#dc2626' : '#16a34a';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('caresense_user');
    return saved ? JSON.parse(saved) : { id: 1, name: 'Dr. Mehta', role: 'Doctor', email: 'dr.mehta@caresense.io' };
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(1);
  const [vitals, setVitals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connError, setConnError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);

  const selectedPatient = WARD_PATIENTS.find((p) => p.id === selectedPatientId) || WARD_PATIENTS[0];

  const loadData = useCallback(async () => {
    try {
      const [v, a] = await Promise.all([
        fetchVitals(selectedPatientId),
        fetchAlerts(selectedPatientId),
      ]);
      setVitals(v);
      setAlerts(a);
      setConnError(null);
      setLastUpdated(new Date());

      // If there is an active unacknowledged critical alert, trigger the Fig 7.3 modal
      const criticalAlert = a.find((item) => item.level === 'CRITICAL' && !item.acknowledged);
      if (criticalAlert && !activeEmergency) {
        setActiveEmergency(criticalAlert);
      }
    } catch (err) {
      console.error('Backend connection error:', err);
      setConnError('Cannot reach backend — is the Django server running?');
    }
  }, [selectedPatientId, activeEmergency]);

  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      try {
        const [v, a] = await Promise.all([
          fetchVitals(selectedPatientId),
          fetchAlerts(selectedPatientId),
        ]);
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
  }, [selectedPatientId]);

  const handleAcknowledge = async (id) => {
    if (id !== 999) {
      try {
        await acknowledgeAlert(id);
      } catch (err) {
        console.warn('Alert acknowledge failed:', err);
      }
    }
    if (activeEmergency && activeEmergency.id === id) {
      setActiveEmergency((prev) => (prev ? { ...prev, acknowledged: true } : null));
    }
    loadData();
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('caresense_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('caresense_user');
  };

  const handleTriggerEmergencyPreview = () => {
    setActiveEmergency({
      id: 999,
      level: 'CRITICAL',
      message: 'HR spike 145 BPM, SpO2 85%, Fall detected',
      reading: { heart_rate: 145.0, spo2: 85.0, temperature: 38.9, motion_flag: true },
      channels_sent: 'SMS, Email and Push Notification',
      acknowledged: false,
      created_at: new Date().toISOString(),
    });
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const latest = vitals[0];

  return (
    <div className="layout-wrapper">
      {/* Fig. 7.2 Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Dashboard */}
      <main className="main-content">
        {/* Top Header Bar */}
        <header className="top-header">
          <div className="top-header-left">
            <h1 className="greeting-title">Good afternoon, {currentUser.name}</h1>
            <p className="status-subtitle">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' • '}
              <span className="watch-count">{WARD_PATIENTS.length} patients under watch</span>
            </p>
          </div>

          <div className="top-header-right">
            <button
              type="button"
              className="preview-emergency-btn"
              onClick={handleTriggerEmergencyPreview}
              title="Preview Fig. 7.3 Emergency Modal"
            >
              🚨 Preview Emergency Modal
            </button>

            <div className="doctor-pill-badge">
              <span className="doc-avatar" aria-hidden="true">👨‍⚕️</span>
              <span className="doc-name">{currentUser.name}</span>
            </div>
          </div>
        </header>

        {/* Patient-Selector Strip (Matches Fig. 7.2) */}
        <PatientSelector
          patients={WARD_PATIENTS}
          selectedPatientId={selectedPatientId}
          onSelectPatient={(id) => setSelectedPatientId(id)}
        />

        {connError && <div className="conn-error">{connError}</div>}

        {!connError && !latest && (
          <div className="empty-panel">
            <p className="empty-msg">
              Waiting for telemetry reading from <strong>{selectedPatient.name}</strong> ({selectedPatient.device_id})…
            </p>
            <p className="empty-subtext">ESP32 telemetry pushes every 5 seconds to /api/v1/vitals/.</p>
          </div>
        )}

        {latest && (
          <>
            {/* 4 Vital Cards Grid (Matches Fig. 7.2) */}
            <section className="vitals-grid" aria-label="Vital Signs Grid">
              <VitalCard
                label="Heart Rate"
                value={latest.heart_rate.toFixed(0)}
                unit="BPM"
                normalRange="Normal (60-100)"
                statusColor={statusColor(latest.heart_rate, (v) => v < 50 || v > 120)}
              />
              <VitalCard
                label="SpO2"
                value={latest.spo2.toFixed(0)}
                unit="%"
                normalRange="Normal (≥95%)"
                statusColor={statusColor(latest.spo2, (v) => v < 92)}
              />
              <VitalCard
                label="Temperature"
                value={latest.temperature.toFixed(1)}
                unit="C"
                normalRange="Normal (36.1-37.2)"
                statusColor={statusColor(latest.temperature, (v) => v > 38.5)}
              />
              <VitalCard
                label="Motion / Fall"
                value={latest.motion_flag ? 'Fall detected' : 'Stable'}
                unit=""
                normalRange="No fall detected"
                statusColor={latest.motion_flag ? '#dc2626' : '#16a34a'}
              />
            </section>

            {/* Middle Row: Trend Chart (Left) + Alert Log (Right) */}
            <div className="middle-row-grid">
              <section className="panel chart-panel">
                <div className="panel-header">
                  <h2>Heart Rate — Last 6 Hours</h2>
                  <span className="threshold-legend">Threshold: 120 BPM</span>
                </div>
                <HeartRateChart vitals={vitals} />
              </section>

              <section className="panel alerts-panel">
                <div className="panel-header">
                  <h2>Recent Alert Log</h2>
                  {lastUpdated && (
                    <span className="last-sync">Sync: {lastUpdated.toLocaleTimeString()}</span>
                  )}
                </div>
                <AlertLog alerts={alerts} onAcknowledge={handleAcknowledge} />
              </section>
            </div>

            {/* Bottom Row: Patient History Table */}
            <section className="panel history-panel">
              <div className="panel-header">
                <h2>Patient History (last 5 readings)</h2>
                <span className="panel-tag">{selectedPatient.name} — Room {selectedPatient.room}</span>
              </div>
              <HistoryTable vitals={vitals.slice(0, 5)} />
            </section>
          </>
        )}
      </main>

      {/* Fig. 7.3 Full-Screen Emergency Alert Modal */}
      {activeEmergency && (
        <EmergencyModal
          alert={activeEmergency}
          patient={selectedPatient}
          onClose={() => setActiveEmergency(null)}
          onAcknowledge={handleAcknowledge}
        />
      )}
    </div>
  );
}
