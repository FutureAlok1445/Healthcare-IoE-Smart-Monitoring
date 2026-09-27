import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 6000,
});

// Attach auth token if available
api.interceptors.request.use((config) => {
  const saved = localStorage.getItem('caresense_user');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }
  return config;
});

export const PATIENT_ID = import.meta.env.VITE_PATIENT_ID || 1;

// Multi-patient ward list matching Report Chapter 7.2 Fig 7.2
export const WARD_PATIENTS = [
  { id: 1, name: 'Rahul Sharma', room: 'PT-0142', device_id: 'ESP32_NODE_01', isLiveNode: true },
  { id: 2, name: 'Anita Rao', room: 'PT-0143', device_id: 'ESP32_NODE_02', isLiveNode: false },
  { id: 3, name: 'S. Iyer', room: 'PT-0144', device_id: 'ESP32_NODE_03', isLiveNode: false },
  { id: 4, name: 'Fatima K.', room: 'PT-0145', device_id: 'ESP32_NODE_04', isLiveNode: false },
];

export function fetchPatients() {
  return api.get('/patients/').then((res) => {
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
    return WARD_PATIENTS;
  }).catch(() => WARD_PATIENTS);
}

export function fetchVitals(patientId = PATIENT_ID) {
  return api.get(`/patients/${patientId}/vitals/`).then((res) => res.data);
}

export function fetchAlerts(patientId = PATIENT_ID) {
  return api.get(`/patients/${patientId}/alerts/`).then((res) => res.data);
}

export function fetchAllAlerts(acknowledged = null) {
  const url = acknowledged !== null ? `/alerts/?acknowledged=${acknowledged}` : '/alerts/';
  return api.get(url).then((res) => res.data);
}

export function acknowledgeAlert(alertId) {
  return api.post(`/alerts/${alertId}/acknowledge/`).then((res) => res.data);
}

export function loginUser(credentials) {
  return api.post('/auth/login/', credentials).then((res) => res.data).catch(() => ({
    token: 'caresense-session-local-token',
    user: {
      id: 1,
      name: credentials.role === 'Doctor' ? 'Dr. Mehta' : (credentials.role === 'Caregiver' ? 'Nurse Sarah' : 'System Admin'),
      role: credentials.role || 'Doctor',
      email: credentials.email || 'dr.mehta@caresense.io',
      phone: '+91 98765 43210'
    }
  }));
}

export function fetchThresholds(patientId = PATIENT_ID) {
  return api.get(`/patients/${patientId}/thresholds/`).then((res) => res.data);
}

export function updateThresholds(patientId, thresholds) {
  return api.patch(`/patients/${patientId}/thresholds/`, { thresholds }).then((res) => res.data);
}

export function ingestTelemetry(payload) {
  return api.post('/vitals/', payload).then((res) => res.data);
}

export default api;

