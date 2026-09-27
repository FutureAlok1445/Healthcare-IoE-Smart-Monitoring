import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({ baseURL: BASE_URL });

// This mini-project prototype has a single wearable node / single patient
// (see report Chapter 1.4 Scope). VITE_PATIENT_ID defaults to 1, which is
// the id Django assigns to the first patient auto-created from the ESP32's
// DEVICE_ID on its very first POST to /api/v1/vitals/.
export const PATIENT_ID = import.meta.env.VITE_PATIENT_ID || 1;

export function fetchVitals() {
  return api.get(`/patients/${PATIENT_ID}/vitals/`).then((res) => res.data);
}

export function fetchAlerts() {
  return api.get(`/patients/${PATIENT_ID}/alerts/`).then((res) => res.data);
}

export function acknowledgeAlert(alertId) {
  return api.post(`/alerts/${alertId}/acknowledge/`).then((res) => res.data);
}

export default api;
