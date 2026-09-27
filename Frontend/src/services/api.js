import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
});

const BUILT_IN_DEMO_DATA = {
  users: [
    { email: 'dr.mehta@caresense.io', password: 'DoctorPass2026!', display_name: 'Dr. Ronald Mehta', username: 'dr.mehta', role: 'DOCTOR', permissions: { can_update_thresholds: true } },
    { email: 'nurse.sarah@caresense.io', password: 'NursePass2026!', display_name: 'Sarah Jenkins', username: 'nurse.sarah', role: 'NURSE', permissions: { can_update_thresholds: false } },
    { email: 'admin@caresense.io', password: 'AdminPass2026!', display_name: 'System Administrator', username: 'admin', role: 'ADMIN', permissions: { can_update_thresholds: true } },
  ],
  patients: [
    { id: 1, name: 'Rahul Sharma', device_id: 'ESP32_NODE_01', room: 'PT-0142', data_source: 'SIMULATION', thresholds: { hr_min: 50, hr_max: 120, spo2_min: 92, temp_max: 38.5 } },
    { id: 2, name: 'Anita Rao', device_id: 'ESP32_NODE_02', room: 'PT-0143', data_source: 'SIMULATION', thresholds: { hr_min: 55, hr_max: 115, spo2_min: 93, temp_max: 38.0 } },
    { id: 3, name: 'S. Iyer', device_id: 'ESP32_NODE_03', room: 'PT-0144', data_source: 'SIMULATION', thresholds: { hr_min: 50, hr_max: 110, spo2_min: 90, temp_max: 38.2 } },
    { id: 4, name: 'Fatima K.', device_id: 'ESP32_NODE_04', room: 'PT-0145', data_source: 'SIMULATION', thresholds: { hr_min: 60, hr_max: 125, spo2_min: 94, temp_max: 38.5 } },
  ],
  vitals: [],
  alerts: [],
};

let demoDataPromise;
let demoNextId = 1000;

function prepareDemoData(data) {
  const now = Date.now();
  (data.vitals || []).forEach((vital, index) => {
    vital.received_at = new Date(now - index * 60 * 1000).toISOString();
  });
  (data.alerts || []).forEach((alert, index) => {
    alert.created_at = new Date(now - index * 4 * 60 * 1000).toISOString();
  });
  return data;
}

function getDemoData() {
  if (!demoDataPromise) {
    demoDataPromise = fetch('/demo-data.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Optional demo file is missing'))))
      .catch(() => BUILT_IN_DEMO_DATA)
      .then(prepareDemoData);
  }
  return demoDataPromise;
}

function findDemoPatient(data, patientId) {
  return data.patients.find(
    (patient) => String(patient.id) === String(patientId) || patient.device_id === patientId
  );
}

function demoVitals(data, patientId) {
  const patient = findDemoPatient(data, patientId);
  return (data.vitals || []).filter((vital) => vital.patient_id === patient?.id || vital.device_id === patient?.device_id);
}

function demoAlerts(data, patientId) {
  const patient = findDemoPatient(data, patientId);
  return (data.alerts || []).filter((alert) => alert.patient_id === patient?.id);
}

// Attach DRF Token authentication header if token exists
api.interceptors.request.use((config) => {
  const saved = localStorage.getItem('caresense_user');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user.token) {
        config.headers.Authorization = `Token ${user.token}`;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }
  return config;
});

/** Optional default when no patient is selected yet (resolved server-side by device_id or ward index). */
export const DEFAULT_PATIENT_LOOKUP = import.meta.env.VITE_PATIENT_ID || '1';

export function fetchPatients() {
  return api.get('/patients/').then((res) => (Array.isArray(res.data) ? res.data : [])).catch(() => getDemoData().then((data) => data.patients));
}

export function fetchVitals(patientId) {
  if (patientId == null || patientId === '') {
    return Promise.resolve([]);
  }
  return api.get(`/patients/${patientId}/vitals/`).then((res) => res.data).catch(() => getDemoData().then((data) => demoVitals(data, patientId)));
}

export function fetchAlerts(patientId) {
  if (patientId == null || patientId === '') {
    return Promise.resolve([]);
  }
  return api.get(`/patients/${patientId}/alerts/`).then((res) => res.data).catch(() => getDemoData().then((data) => demoAlerts(data, patientId)));
}

export function fetchAllAlerts(params = {}) {
  const query = typeof params === 'object' && params !== null ? params : {};
  return api.get('/alerts/', { params: query }).then((res) => res.data).catch(() => getDemoData().then((data) => data.alerts || []));
}

export function acknowledgeAlert(alertId) {
  return api.post(`/alerts/${alertId}/acknowledge/`).then((res) => res.data).catch(() => getDemoData().then((data) => {
    const alert = (data.alerts || []).find((item) => String(item.id) === String(alertId));
    if (alert) Object.assign(alert, { acknowledged: true, status: 'ACKNOWLEDGED', acknowledged_by: 'Demo Clinician' });
    return alert;
  }));
}

export function resolveAlert(alertId) {
  return api.post(`/alerts/${alertId}/resolve/`).then((res) => res.data).catch(() => getDemoData().then((data) => {
    const alert = (data.alerts || []).find((item) => String(item.id) === String(alertId));
    if (alert) Object.assign(alert, { acknowledged: true, status: 'RESOLVED', resolved_by: 'Demo Clinician', resolved_at: new Date().toISOString() });
    return alert;
  }));
}

export function loginUser(credentials) {
  return api.post('/auth/login/', credentials).then((res) => res.data).catch(() => getDemoData().then((data) => {
    const user = (data.users || []).find((item) => item.email.toLowerCase() === String(credentials.email).toLowerCase() && item.password === credentials.password);
    if (!user) throw new Error('Demo credentials not recognised');
    return { user, token: `demo-token-${user.username}` };
  }));
}

export function logoutUser() {
  return api.post('/auth/logout/').then((res) => res.data).catch(() => null);
}

export function getCurrentUser() {
  return api.get('/auth/me/').then((res) => res.data).catch((error) => {
    const saved = localStorage.getItem('caresense_user');
    if (!error.response && saved) {
      try {
        const user = JSON.parse(saved);
        if (user.token?.startsWith('demo-token-')) {
          return { user };
        }
      } catch {
        // Let the caller handle an invalid saved session.
      }
    }
    throw error;
  });
}

export function fetchThresholds(patientId) {
  if (patientId == null || patientId === '') {
    return Promise.reject(new Error('No patient selected'));
  }
  return api.get(`/patients/${patientId}/thresholds/`).then((res) => res.data).catch(() => getDemoData().then((data) => {
    const patient = findDemoPatient(data, patientId);
    return { patient_id: patient?.id, name: patient?.name, device_id: patient?.device_id, room: patient?.room, thresholds: patient?.thresholds || {} };
  }));
}

export function updateThresholds(patientId, thresholds) {
  return api.patch(`/patients/${patientId}/thresholds/`, { thresholds }).then((res) => res.data).catch(() => getDemoData().then((data) => {
    const patient = findDemoPatient(data, patientId);
    if (!patient) throw new Error('Demo patient not found');
    patient.thresholds = { ...(patient.thresholds || {}), ...thresholds };
    return { status: 'updated', patient_id: patient.id, device_id: patient.device_id, thresholds: patient.thresholds };
  }));
}

export function ingestTelemetry(payload) {
  const data = {
    source: 'simulation',
    ...payload,
  };
  return api.post('/vitals/', data).then((res) => res.data).catch(() => getDemoData().then((demo) => {
    const patient = findDemoPatient(demo, data.device_id) || demo.patients[0];
    const reading = { id: demoNextId++, patient_id: patient.id, device_id: patient.device_id, ...data, received_at: new Date().toISOString() };
    demo.vitals = [reading, ...(demo.vitals || [])];
    if (data.state !== 'NORMAL' || data.motion_flag || data.sos_pressed) {
      demo.alerts = [{ id: demoNextId++, patient_id: patient.id, patient_name: patient.name, room: patient.room, level: data.state === 'NORMAL' ? 'WATCH' : data.state, status: 'NEW', alert_type: data.sos_pressed ? 'SOS_EMERGENCY' : data.motion_flag ? 'FALL_DETECTED' : 'THRESHOLD_BREACH', message: 'Demo event received from the simulator', value: 'See latest vitals', threshold: 'Patient limits', source: 'simulation', channels_sent: 'Ward screen', acknowledged: false, created_at: reading.received_at }, ...(demo.alerts || [])];
    }
    return { id: reading.id, patient_id: patient.id, device_id: patient.device_id, state: reading.state, source: reading.source, received_at: reading.received_at };
  }));
}

export default api;
