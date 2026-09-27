# Healthcare IoE — Frontend (React + Vite)

Live dashboard ("CareSense IoE") that polls the Django backend every 5 seconds
(matching the ESP32's SENSOR_INTERVAL_MS) and shows current vitals, an alert
log, a heart-rate trend chart, and recent reading history.
It also includes a no-hardware demo mode for local evaluation.

## Setup

```
npm install
npm run dev
```

Opens at http://localhost:5173. The dashboard uses Django when available;
otherwise it loads `public/demo-data.json` and works with the demo accounts in
the root README.

## Configuration

Edit `.env` to point at a different backend or patient:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_PATIENT_ID=1
```

The dashboard supports multiple ward patients. `VITE_PATIENT_ID` can select a
patient by database ID or device ID, such as `ESP32_NODE_01`.

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
