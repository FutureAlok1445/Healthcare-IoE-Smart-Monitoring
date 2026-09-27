# Healthcare IoE — Backend (Django + DRF)

Receives sensor data from the ESP32 firmware, stores it, and auto-raises alerts.
The backend is optional for the no-hardware demo. Start it when you need
database persistence, API testing, or real ESP32 telemetry.

Clinical patient and alert endpoints require a DRF token from the login API.
The telemetry ingestion endpoint remains open so an ESP32 can post readings
without a browser session.

## Setup

```
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Server runs at http://127.0.0.1:8000

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/v1/vitals/ | ESP32 pushes a new vital reading |
| GET | /api/v1/patients/ | List all registered patients with latest vitals & alert counts |
| GET | /api/v1/patients/<id_or_device_id>/ | Details for a specific patient |
| GET | /api/v1/patients/<id_or_device_id>/vitals/ | Recent readings for a patient (by ID or device_id) |
| GET | /api/v1/patients/<id_or_device_id>/alerts/ | Alert history for a patient |
| GET | /api/v1/alerts/ | List all alerts (filter with `?acknowledged=false`) |
| POST | /api/v1/alerts/<id>/acknowledge/ | Mark an alert as acknowledged |

## Alert Latching, Escalation & Anti-Flooding

When an ESP32 sends a `WATCH` or `CRITICAL` reading, the server recalculates
the clinical state from the measured values and the patient's thresholds:
- If no active (`NEW` or `ACKNOWLEDGED`) alert exists for that incident type, a new alert is generated.
- **Alert Escalation (WATCH → CRITICAL):** If a patient already has an active `WATCH` alert and condition worsens to `CRITICAL`, the active alert is automatically escalated to `CRITICAL` in-place (updating severity, message, and readings) without creating duplicate unacknowledged records.
- **Anti-Flooding:** If an active alert of the same incident type already exists, it is updated in-place with the latest vital values rather than spamming duplicate rows in the database every 5 seconds.
- Once acknowledged by medical staff, subsequent breaches will trigger a fresh alert.

## JSON payload expected by /api/v1/vitals/

Matches exactly what the ESP32 firmware (main.cpp) sends:

```json
{
  "device_id": "ESP32_NODE_01",
  "heart_rate": 78.5,
  "spo2": 97.0,
  "temperature": 36.8,
  "motion_flag": false,
  "sos_pressed": false,
  "state": "NORMAL",
  "timestamp": 123456
}
```

A Patient is auto-created the first time a new device_id is seen.
An Alert is auto-created whenever state is WATCH or CRITICAL.

## Admin panel

Create a superuser to browse data visually:
```
python manage.py createsuperuser
```
Then visit http://127.0.0.1:8000/admin/

## Notes

- Uses SQLite for now (zero setup). Switch to PostgreSQL later by changing
  DATABASES in healthcare_backend/settings.py.
- CORS is wide open (CORS_ALLOW_ALL_ORIGINS = True) for development so the
  React frontend can call this freely. Tighten before deploying publicly.
- notifications/ app is a placeholder — email/SMS/push dispatch goes here later.
