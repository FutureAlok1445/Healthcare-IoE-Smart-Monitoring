import { useEffect, useState, useCallback } from 'react';
import VitalCard from './components/VitalCard';
import AlertLog from './components/AlertLog';
import HistoryTable from './components/HistoryTable';
import HeartRateChart from './components/HeartRateChart';
import Sidebar from './components/Sidebar';
import PatientSelector from './components/PatientSelector';
import EmergencyModal from './components/EmergencyModal';
import Login from './components/Login';
import LiveVitalsTab from './components/LiveVitalsTab';
import PatientsTab from './components/PatientsTab';
import AlertsTab from './components/AlertsTab';
import ReportsTab from './components/ReportsTab';
import SettingsTab from './components/SettingsTab';
import {
  IconUser,
  IconAlertTriangle,
  IconCpu,
} from './components/Icons';
import {
  fetchPatients,
  fetchVitals,
  fetchAlerts,
  fetchAllAlerts,
  acknowledgeAlert,
  WARD_PATIENTS,
} from './services/api';
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
  const [patients, setPatients] = useState(WARD_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState(1);
  const [vitals, setVitals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [connError, setConnError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0] || WARD_PATIENTS[0];

  const loadData = useCallback(async () => {
    try {
      const [plist, v, a, allA] = await Promise.all([
        fetchPatients(),
        fetchVitals(selectedPatientId),
        fetchAlerts(selectedPatientId),
        fetchAllAlerts(),
      ]);
      setPatients(plist);
      if (plist.length > 0 && !plist.some((p) => p.id === selectedPatientId)) {
        setSelectedPatientId(plist[0].id);
      }
      setVitals(v);
      setAlerts(a);
      setAllAlerts(allA);
      setConnError(null);
      setLastUpdated(new Date());

      // If there is an active unacknowledged critical alert, trigger the modal
      const criticalAlert = a.find((item) => item.level === 'CRITICAL' && !item.acknowledged);
      if (criticalAlert && !activeEmergency) {
        setActiveEmergency(criticalAlert);
      }
    } catch (err) {
      console.error('Backend connection error:', err);
      setConnError('Cannot reach backend — is Django running at http://localhost:8000?');
    }
  }, [selectedPatientId, activeEmergency]);

  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      try {
        const [plist, v, a, allA] = await Promise.all([
          fetchPatients(),
          fetchVitals(selectedPatientId),
          fetchAlerts(selectedPatientId),
          fetchAllAlerts(),
        ]);
        if (isMounted) {
          setPatients(plist);
          if (plist.length > 0 && !plist.some((p) => p.id === selectedPatientId)) {
            setSelectedPatientId(plist[0].id);
          }
          setVitals(v);
          setAlerts(a);
          setAllAlerts(allA);
          setConnError(null);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (isMounted) {
          console.error('Backend connection error:', err);
          setConnError('Cannot reach backend — is Django running at http://localhost:8000?');
        }
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
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
  const lastPacketSec = latest?.received_at
    ? Math.max(0, Math.floor((currentTime - new Date(latest.received_at).getTime()) / 1000))
    : null;

  let heartbeatStatus = 'OFFLINE';
  let heartbeatLabel = 'Hardware Offline';
  let heartbeatClass = 'status-offline';

  if (lastPacketSec !== null && lastPacketSec < 25) {
    heartbeatStatus = 'ONLINE';
    heartbeatLabel = `Live Hardware (${lastPacketSec}s ago)`;
    heartbeatClass = 'status-online';
  } else if (lastPacketSec !== null && lastPacketSec < 75) {
    heartbeatStatus = 'STALE';
    heartbeatLabel = `Telemetry Stale (${lastPacketSec}s)`;
    heartbeatClass = 'status-stale';
  }

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
              <span className="watch-count">{patients.length} patients monitored in ward</span>
            </p>
          </div>

          <div className="top-header-right">
            {/* Hardware Heartbeat Indicator */}
            <div
              className={`hardware-badge ${heartbeatClass}`}
              data-status={heartbeatStatus}
              title={`Wearable node ${selectedPatient.device_id} status (${heartbeatStatus})`}
            >
              <span className="heartbeat-pulse" />
              <IconCpu size={14} />
              <span>{heartbeatLabel}</span>
            </div>

            <button
              type="button"
              className="preview-emergency-btn"
              onClick={handleTriggerEmergencyPreview}
              title="Preview Fig. 7.3 Emergency Modal"
            >
              <IconAlertTriangle size={14} />
              <span>Simulate Emergency Modal</span>
            </button>

            <div className="doctor-pill-badge">
              <span className="doc-avatar" aria-hidden="true">
                <IconUser size={15} />
              </span>
              <span className="doc-name">{currentUser.name}</span>
            </div>
          </div>
        </header>

        {/* Patient-Selector Strip (Matches Fig. 7.2) */}
        <PatientSelector
          patients={patients}
          selectedPatientId={selectedPatientId}
          onSelectPatient={(id) => setSelectedPatientId(id)}
        />

        {connError && (
          <div className="conn-error">
            <strong>Connection Notice:</strong> {connError}
          </div>
        )}

        {/* Tab 1: Clinical Dashboard */}
        {activeTab === 'dashboard' && (
          <>
            {!connError && !latest && (
              <div className="empty-panel">
                <IconCpu size={36} color="#94a3b8" />
                <p className="empty-msg">
                  Waiting for telemetry reading from <strong>{selectedPatient.name}</strong> ({selectedPatient.device_id})…
                </p>
                <p className="empty-subtext">
                  ESP32 firmware pushes every 5 seconds to <code>/api/v1/vitals/</code>. You can also inject telemetry via the <strong>Settings</strong> tab simulator.
                </p>
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
                    unit="°C"
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
                      <h2>Heart Rate — Recent Telemetry Trend</h2>
                      <span className="threshold-legend">Threshold: 120 BPM</span>
                    </div>
                    <HeartRateChart vitals={vitals} />
                  </section>

                  <section className="panel alerts-panel">
                    <div className="panel-header">
                      <h2>Patient Alert Log</h2>
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
                    <h2>Patient History (Recent Readings)</h2>
                    <span className="panel-tag">{selectedPatient.name} — Room {selectedPatient.room || 'PT-0142'}</span>
                  </div>
                  <HistoryTable vitals={vitals.slice(0, 5)} />
                </section>
              </>
            )}
          </>
        )}

        {/* Tab 2: Raw Live Vitals & Sensor Telemetry */}
        {activeTab === 'live-vitals' && (
          <LiveVitalsTab patient={selectedPatient} latestVital={latest} vitals={vitals} />
        )}

        {/* Tab 3: Complete Ward Patients Directory */}
        {activeTab === 'patients' && (
          <PatientsTab
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={(id) => {
              setSelectedPatientId(id);
              setActiveTab('dashboard');
            }}
          />
        )}

        {/* Tab 4: Ward Alert Audit Trail */}
        {activeTab === 'alerts' && (
          <AlertsTab alerts={allAlerts} onAcknowledge={handleAcknowledge} />
        )}

        {/* Tab 5: Shift Reports & Clinical Export */}
        {activeTab === 'reports' && (
          <ReportsTab patient={selectedPatient} vitals={vitals} alerts={alerts} />
        )}

        {/* Tab 6: System Configuration & Telemetry Simulator */}
        {activeTab === 'settings' && (
          <SettingsTab patient={selectedPatient} onRefreshData={loadData} />
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
