import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import CommandPalette from './components/CommandPalette';
import {
  IconUser,
  IconAlertTriangle,
  IconSearch,
  IconActivity,
} from './components/Icons';
import {
  fetchPatients,
  fetchVitals,
  fetchAlerts,
  fetchAllAlerts,
  acknowledgeAlert,
  resolveAlert,
  logoutUser,
  getCurrentUser,
} from './services/api';
import './App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('caresense_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('caresense_theme') || 'light';
  });

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [connError, setConnError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('caresense_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Clock tick to compute live seconds-ago indicators
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Validate session on mount
  useEffect(() => {
    if (currentUser?.token) {
      getCurrentUser()
        .then((data) => {
          if (data?.user) {
            setCurrentUser((prev) => ({ ...prev, ...data.user }));
          }
        })
        .catch((error) => {
          if (error.response?.status === 401) {
            localStorage.removeItem('caresense_user');
            setCurrentUser(null);
          }
        });
    }
  }, [currentUser?.token]);

  const selectedPatient = useMemo(() => {
    if (!patients.length) return null;
    return patients.find((p) => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  const applyTelemetryPayload = useCallback((plist, v, a, allA) => {
    setPatients(plist);
    if (plist.length > 0) {
      const stillValid = selectedPatientId != null && plist.some((p) => p.id === selectedPatientId);
      if (!stillValid) {
        setSelectedPatientId(plist[0].id);
      }
    } else {
      setSelectedPatientId(null);
    }
    setVitals(v);
    setAlerts(a);
    setAllAlerts(allA);
    setConnError(null);
    setLastUpdated(new Date());

    const criticalAlert = a.find(
      (item) =>
        item.level === 'CRITICAL' &&
        item.status === 'NEW' &&
        !item.acknowledged
    );
    if (criticalAlert) {
      setActiveEmergency((prev) => {
        if (prev?.id === 999) return prev;
        if (prev?.id === criticalAlert.id) return prev;
        return criticalAlert;
      });
    }
  }, [selectedPatientId]);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const plist = await fetchPatients();
      const patientKey = selectedPatientId ?? plist[0]?.id;
      const [v, a, allA] = await Promise.all([
        fetchVitals(patientKey),
        fetchAlerts(patientKey),
        fetchAllAlerts(),
      ]);
      applyTelemetryPayload(plist, v, a, allA);
    } catch (err) {
      console.error('Backend connection error:', err);
      setConnError('Cannot reach backend — is Django running at http://localhost:8000?');
    }
  }, [selectedPatientId, currentUser, applyTelemetryPayload]);

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    const poll = async () => {
      try {
        const plist = await fetchPatients();
        const patientKey = selectedPatientId ?? plist[0]?.id;
        const [v, a, allA] = await Promise.all([
          fetchVitals(patientKey),
          fetchAlerts(patientKey),
          fetchAllAlerts(),
        ]);
        if (isMounted) {
          applyTelemetryPayload(plist, v, a, allA);
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
  }, [selectedPatientId, currentUser, applyTelemetryPayload]);

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

  const handleResolve = async (id) => {
    if (id !== 999) {
      try {
        await resolveAlert(id);
      } catch (err) {
        console.warn('Alert resolve failed:', err);
      }
    }
    if (activeEmergency && activeEmergency.id === id) {
      setActiveEmergency(null);
    }
    loadData();
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('caresense_user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Continue cleanup
    }
    setCurrentUser(null);
    localStorage.removeItem('caresense_user');
  };

  const handleTriggerEmergencyPreview = () => {
    const previewReading = latest
      ? {
          heart_rate: latest.heart_rate,
          spo2: latest.spo2,
          temperature: latest.temperature,
          motion_flag: latest.motion_flag,
        }
      : { heart_rate: 145.0, spo2: 85.0, temperature: 38.9, motion_flag: true };
    setActiveEmergency({
      id: 999,
      level: 'CRITICAL',
      status: 'NEW',
      message: 'Training preview — critical breach simulation',
      reading: previewReading,
      channels_sent: 'SMS, Email, Hospital Intercom Siren',
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

  const latestSource = (
    latest?.source ||
    (selectedPatient?.data_source === 'SIMULATION' ? 'simulation' : 'hardware')
  ).toLowerCase();
  const isSim = latestSource === 'simulation';

  let statusLabel = 'Continuous Monitoring Active';
  let statusClass = 'chip-online';

  if (isSim) {
    statusLabel = 'Demonstration Mode';
    statusClass = 'chip-simulated';
  } else if (lastPacketSec !== null && lastPacketSec > 120) {
    statusLabel = 'Standby Mode';
    statusClass = 'chip-stale';
  }

  const activeAlertsCount = allAlerts.filter((a) => a.status === 'NEW' || !a.acknowledged).length;

  // Sparkline data extractions
  const hrSparkline = vitals.slice(0, 16).map((v) => Number(v.heart_rate)).reverse();
  const spo2Sparkline = vitals.slice(0, 16).map((v) => Number(v.spo2)).reverse();
  const tempSparkline = vitals.slice(0, 16).map((v) => Number(v.temperature)).reverse();
  const motionSparkline = vitals.slice(0, 16).map((v) => (v.motion_flag ? 2.8 : 1.0)).reverse();

  const hrVal = latest ? Number(latest.heart_rate) : null;
  const spo2Val = latest ? Number(latest.spo2) : null;
  const tempVal = latest ? Number(latest.temperature) : null;

  const hrStatusType =
    hrVal == null ? 'ok' : hrVal > 120 ? 'danger' : hrVal < 50 ? 'watch' : 'ok';
  const spo2StatusType =
    spo2Val == null ? 'ok' : spo2Val < 92 ? 'danger' : spo2Val < 95 ? 'watch' : 'ok';
  const tempStatusType =
    tempVal == null ? 'ok' : tempVal > 38.5 ? 'danger' : tempVal > 37.5 ? 'watch' : 'ok';

  return (
    <div className="layout-master">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={currentUser}
        onLogout={handleLogout}
        activeAlertsCount={activeAlertsCount}
      />

      {/* Main Clinical Body */}
      <main className="main-viewport">
        {/* Clinical Top App Bar */}
        <header className="clinical-topbar">
          <div className="topbar-left">
            <div className="breadcrumb-line">
              <span className="ward-location">Ward A Inpatient Care</span>
              <span className="crumb-separator">•</span>
              <span className="active-nodes-tag tabular-nums">{patients.length} Monitored Patients</span>
            </div>
            <h1 className="topbar-heading">
              {activeTab === 'dashboard' && `Patient Overview — ${selectedPatient?.name || 'Select patient'}`}
              {activeTab === 'live-vitals' && `Real-Time Vitals — ${selectedPatient?.name || 'Select patient'}`}
              {activeTab === 'patients' && 'Ward Inpatient Directory'}
              {activeTab === 'alerts' && 'Patient Incidents & Alerts'}
              {activeTab === 'reports' && `Shift Summary & Reports — ${selectedPatient?.name}`}
              {activeTab === 'settings' && `Patient Alert Limits & Preferences — ${selectedPatient?.name}`}
            </h1>
          </div>

          <div className="topbar-right">
            {/* Quick Jump Command Palette Button */}
            <button
              type="button"
              className="topbar-action-btn cmd-btn"
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Search or jump (Ctrl+K / ⌘K)"
            >
              <IconSearch size={14} />
              <span className="cmd-label">Quick Jump</span>
              <kbd className="kbd-shortcut">⌘K</kbd>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              className="topbar-action-btn theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Night Ward Mode' : 'Clinical Light Mode'}`}
            >
              <IconActivity size={14} />
              <span>{theme === 'light' ? 'Night Ward' : 'Light Mode'}</span>
            </button>

            {/* Central System Status Badge */}
            <div className={`clinical-status-pill ${statusClass}`}>
              <span className="status-live-dot" />
              <span>{statusLabel}</span>
            </div>

            {/* Clinician Profile Dropdown */}
            <div className="clinician-profile-chip">
              <div className="profile-avatar">
                <IconUser size={15} />
              </div>
              <div className="profile-meta">
                <span className="profile-name">{currentUser.display_name || currentUser.name || 'Dr. Mehta'}</span>
                <span className={`profile-role-sub role-${(currentUser.role || 'DOCTOR').toLowerCase()}`}>
                  {currentUser.role || 'DOCTOR'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Patient Switcher Horizontal Rail */}
        <PatientSelector
          patients={patients}
          selectedPatientId={selectedPatientId}
          onSelectPatient={(id) => setSelectedPatientId(id)}
        />

        {connError && (
          <div className="backend-conn-alert" role="alert">
            <IconAlertTriangle size={16} />
            <span>{connError}</span>
          </div>
        )}

        {/* TAB 1: Clinical Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-content-flow">
            {!connError && patients.length === 0 && (
              <div className="dashboard-empty-card">
                <div className="empty-icon-ring">
                  <IconActivity size={32} color="var(--brand-primary)" />
                </div>
                <h3>No Ward Patients Registered</h3>
                <p>
                  Run <strong>python manage.py seed_ward</strong> on the backend, or register patients via the API / admin panel.
                </p>
              </div>
            )}

            {!connError && patients.length > 0 && !latest && selectedPatient && (
              <div className="dashboard-empty-card">
                <div className="empty-icon-ring">
                  <IconActivity size={32} color="var(--brand-primary)" />
                </div>
                <h3>Awaiting Patient Telemetry</h3>
                <p>
                  Connecting to bedside monitor for <strong>{selectedPatient.name}</strong> (Bed {selectedPatient.room || selectedPatient.id}).
                </p>
                <span className="empty-subnote">
                  Continuous vital sign telemetry will appear here automatically. You can also evaluate simulated patient conditions from the <strong>Settings</strong> tab.
                </span>
              </div>
            )}

            {latest && (
              <>
                {/* 4 Equal-Height KPI Vitals Cards */}
                <section className="kpi-vitals-grid" aria-label="Biometric KPI Readouts">
                  {/* Heart Rate Card */}
                  <VitalCard
                    label="Heart Rate"
                    value={hrVal != null ? hrVal.toFixed(0) : '—'}
                    unit="BPM"
                    normalRange="Normal (50–120 BPM)"
                    statusType={hrStatusType}
                    sparklineData={hrSparkline}
                    metricKey="hr"
                  />

                  {/* Blood Oxygen SpO2 Card */}
                  <VitalCard
                    label="Blood Oxygen (SpO2)"
                    value={spo2Val != null ? spo2Val.toFixed(1) : '—'}
                    unit="%"
                    normalRange="Clinical Boundary (≥92%)"
                    statusType={spo2StatusType}
                    sparklineData={spo2Sparkline}
                    metricKey="spo2"
                  />

                  {/* Body Temperature Card */}
                  <VitalCard
                    label="Skin Temperature"
                    value={tempVal != null ? tempVal.toFixed(1) : '—'}
                    unit="°C"
                    normalRange="Normothermia (36.0–37.8°C)"
                    statusType={tempStatusType}
                    sparklineData={tempSparkline}
                    metricKey="temp"
                  />

                  {/* 3-Axis Motion / Fall Gauge Card */}
                  <VitalCard
                    label="Patient Activity & Posture"
                    value={latest.motion_flag ? 'Fall' : '1.02'}
                    unit="G"
                    normalRange="Normal (Resting in Bed • Zero Impact)"
                    statusType={latest.motion_flag ? 'danger' : 'ok'}
                    sparklineData={motionSparkline}
                    metricKey="motion"
                    isMotionCard={true}
                    motionFlag={Boolean(latest.motion_flag)}
                    accelMagnitude={latest.motion_flag ? 2.85 : 1.02}
                  />
                </section>

                {/* Primary Data Grid: Left (65%) Trend Chart + Right (35%) Live Alert Feed */}
                <div className="dashboard-charts-row">
                  {/* Left: Recharts Multi-Range Trend Chart */}
                  <section className="dashboard-chart-card">
                    <div className="card-top-title-row">
                      <div>
                        <h3>Physiological Vital Trends</h3>
                        <p className="chart-subhead">Continuous pulse-oximetry and heart-rate monitoring</p>
                      </div>
                      <span className="threshold-boundary-tag">Safe: 50–120 BPM • SpO2 ≥92%</span>
                    </div>
                    <HeartRateChart vitals={vitals} />
                  </section>

                  {/* Right: Live Patient Incident Feed */}
                  <section className="dashboard-alerts-card">
                    <div className="card-top-title-row">
                      <div>
                        <h3>Patient Incident Log</h3>
                        <p className="chart-subhead">Patient-specific physiological alerts</p>
                      </div>
                      {lastUpdated && (
                        <span className="sync-time-stamp tabular-nums">
                          Sync: {lastUpdated.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <AlertLog alerts={alerts} onAcknowledge={handleAcknowledge} />
                  </section>
                </div>

                {/* Bottom Row: Patient Telemetry History Table */}
                <section className="dashboard-history-card">
                  <div className="card-top-title-row">
                    <div>
                      <h3>Recent Vitals Recording Log</h3>
                      <p className="chart-subhead">Continuous vital sign readings recorded during current shift</p>
                    </div>
                    <span className="history-node-tag">
                      Bed {selectedPatient?.room || selectedPatient?.id || '—'} • Ward A
                    </span>
                  </div>
                  <HistoryTable vitals={vitals.slice(0, 8)} />
                </section>
              </>
            )}
          </div>
        )}

        {/* TAB 2: Live Vitals & Sensor Diagnostics */}
        {activeTab === 'live-vitals' && (
          <LiveVitalsTab patient={selectedPatient} latestVital={latest} clinician={currentUser} />
        )}

        {/* TAB 3: Ward Patients Directory */}
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

        {/* TAB 4: Ward Alerts & Audit Trail */}
        {activeTab === 'alerts' && (
          <AlertsTab
            alerts={allAlerts}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
          />
        )}

        {/* TAB 5: Shift Reports & Clinical Export */}
        {activeTab === 'reports' && (
          <ReportsTab patient={selectedPatient} vitals={vitals} alerts={alerts} />
        )}

        {/* TAB 6: Settings, Thresholds & Simulator */}
        {activeTab === 'settings' && selectedPatient && (
          <SettingsTab
            patient={selectedPatient}
            onRefreshData={loadData}
            user={currentUser}
          />
        )}
        {activeTab === 'settings' && !selectedPatient && (
          <div className="dashboard-empty-card">
            <h3>Select a patient</h3>
            <p>Choose a ward patient from the rail above to configure alert limits.</p>
          </div>
        )}
      </main>

      {/* Emergency Code Blue Takeover Modal */}
      {activeEmergency && (
        <EmergencyModal
          alert={activeEmergency}
          patient={selectedPatient}
          onClose={() => setActiveEmergency(null)}
          onAcknowledge={handleAcknowledge}
          onViewVitals={() => setActiveTab('live-vitals')}
        />
      )}

      {/* Quick Jump Command Palette (Ctrl+K / ⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        patients={patients}
        onSelectPatient={(id) => setSelectedPatientId(id)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onTriggerEmergency={handleTriggerEmergencyPreview}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}
