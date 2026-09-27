# Healthcare IoE — Frontend (React + Vite)

Live dashboard ("CareSense IoE") that polls the Django backend every 5 seconds
(matching the ESP32's SENSOR_INTERVAL_MS) and shows current vitals, an alert
log, a heart-rate trend chart, and recent reading history.

## Setup

```
npm install
npm run dev
```

Opens at http://localhost:5173 — make sure the Django backend is running
first (http://localhost:8000) or the dashboard will show a connection error.

## Configuration

Edit `.env` to point at a different backend or patient:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_PATIENT_ID=1
```

This mini-project prototype assumes a single wearable node / single patient
(see report Chapter 1.4 Scope). VITE_PATIENT_ID=1 works because Django
auto-creates the first patient as id 1 the moment the ESP32's first reading
arrives. You can also set VITE_PATIENT_ID to the device_id string directly
(e.g. "ESP32_NODE_01") since the backend accepts both.

## What each part does

- `src/services/api.js` — talks to the Django REST API
- `src/components/VitalCard.jsx` — one colored card per vital sign (green/red
  based on the same thresholds as the firmware)
- `src/components/AlertLog.jsx` — alert list with an Acknowledge button
- `src/components/HistoryTable.jsx` — last 8 readings in a table
- `src/components/HeartRateChart.jsx` — heart-rate trend line (Recharts)
- `src/App.jsx` — ties it all together, polls every 5s

## Build for production

```
npm run build
```
Output goes to `dist/` — deploy that folder to Vercel, Netlify, or any static host.
