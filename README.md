# Healthcare-IoE: Smart Patient Health Monitoring System

An end-to-end, medical IoT / IoE (Internet of Everything) continuous patient monitoring platform. The system acquires real-time vital signs from multiple wearable sensors via an ESP32 microcontroller, performs edge-level breach and fall detection, and streams telemetry over Wi-Fi to a robust Django REST backend with automated alert latching.

---

## 🌟 Key Features

* **Multi-Sensor Edge Ingestion:**
  * **DS18B20:** High-precision digital body temperature (non-blocking, asynchronous conversion).
  * **MPU-6050:** 6-axis accelerometer & gyroscope for impact and free-fall detection.
  * **MAX30102:** Pulse oximetry & optical heart rate (I2C interface).
  * **Emergency SOS:** Hardware push-button with active-low software debouncing and immediate critical latching.
* **Firmware Resilience:**
  * Multi-state alert machine (`NORMAL`, `WATCH`, `CRITICAL`) driving dedicated status LEDs and audible buzzer patterns.
  * 5-slot circular FIFO buffer preserving telemetry during Wi-Fi or server dropouts, flushing automatically upon reconnection.
  * Interactive serial CLI (`help`, `status`, `force`, `clear`) for hardware debugging.
* **Production-Grade Django Backend:**
  * Auto-provisioning of patient profiles upon first device connection.
  * Smart Alert Latching & Anti-Flooding: Updates active alerts in-place rather than generating duplicate database rows every 5 seconds.
  * Dual-identifier URL resolution (`resolve_patient` accepts numeric primary key, hardware `device_id`, ward index '1'-'4', or semantic aliases).
  * Real-time **Hardware Heartbeat**: calculates live node status (`ONLINE`, `STALE`, `OFFLINE`) based on telemetry packet latency.
  * Cybersecurity Hardening: environment variable secret management, CORS/CSRF origin restriction, REST Framework throttling (180 req/min), and HTTP security headers (`nosniff`, `DENY` clickjacking, XSS filter).
  * Automated Ward Seeding (`python manage.py seed_ward`) maintaining official ward patients.
  * Central alert monitoring feed with acknowledgment endpoints.
* **Modern Clinical Dashboard & Multi-Tab Suite:**
  * **Clinical Overview:** Real-time vital cards, Recharts heart rate trend line, alert log, and reading history.
  * **Live Vitals & Sensor Telemetry:** Real-time PPG plethysmogram waveform, MPU-6050 tri-axis accelerometer & gyroscope bars, DS18B20 digital thermometer, and raw JSON REST packet inspector.
  * **Ward Patient Directory:** Complete bed assignment registry with threshold profiles and monitoring shortcuts.
  * **Alerts Audit Trail:** Chronological clinical incident audit log with severity filtering and one-click acknowledgment.
  * **Shift Reports:** Physician handoff summary with KPI metrics (Mean HR, SpO2 floor, Peak Temp) and one-click CSV export.
  * **Settings & Simulator:** Custom clinical threshold tailoring (`PATCH /api/v1/patients/{id}/thresholds/`) and integrated hardware telemetry simulator (Normal, Tachycardia, Hypoxia, Fever, Fall, SOS).
  * **Zero-Emoji Compliance:** Engineered with dedicated SVG icons and modern technical skeuomorphism.

---

## 📐 System Architecture

```text
 [ DS18B20 Temp ]  \
 [ MPU-6050 IMU ]   ->  [ ESP32 NodeMCU-32S ]  ---( Wi-Fi HTTP POST )--->  [ Django REST API ]
 [ MAX30102 PPG ]  /      | Status LEDs                                            | SQLite / PostgreSQL
 [ SOS Pushbutton] /       | Buzzer Alarm                                          v
                           | Local Ring Buffer                            [ Doctor / Nurse Dashboard ]
```

---

## No-Hardware Demo Mode

You can run the complete dashboard without an ESP32, sensors, Wi-Fi, or Django. The frontend tries the Django API first. If it is unavailable, it loads the optional `Frontend/public/demo-data.json` file and provides local demo login, vitals, alerts, thresholds, simulator events, and reports. If that file is deleted, a small built-in fallback keeps the app running without a broken import.

Demo accounts:

| Role | Email | Password |
|---|---|---|
| Doctor | `dr.mehta@caresense.io` | `DoctorPass2026!` |
| Caregiver | `nurse.sarah@caresense.io` | `NursePass2026!` |
| Admin | `admin@caresense.io` | `AdminPass2026!` |

```powershell
cd Frontend
npm install
npm run dev
```

Open `http://localhost:5173/`, expand the demo credentials panel, and sign in. Use Settings to try normal, fast-heart-rate, low-oxygen, fever, fall, and SOS events. The dashboard marks these readings as Demonstration Mode.

---

## 🔌 Hardware Pinout & Wiring

| Component | ESP32 GPIO | Description |
|---|---|---|
| **DS18B20 Data** | `GPIO 4` | OneWire bus (4.7kΩ pull-up to 3.3V) |
| **MPU-6050 / MAX30102 SDA** | `GPIO 21` | Shared I2C SDA (4.7kΩ pull-up to 3.3V) |
| **MPU-6050 / MAX30102 SCL** | `GPIO 22` | Shared I2C SCL (4.7kΩ pull-up to 3.3V) |
| **SOS Push-Button** | `GPIO 27` | Active-low with internal pull-up (`INPUT_PULLUP`) |
| **Status LED: Green** | `GPIO 25` | Normal vital status (220Ω series resistor) |
| **Status LED: Yellow** | `GPIO 26` | Watch / Warning status (220Ω series resistor) |
| **Status LED: Red** | `GPIO 32` | Critical / SOS alert (220Ω series resistor) |
| **Piezo Buzzer** | `GPIO 18` | Audible alert driver |

Complete schematics and breadboard wiring definitions are located in [`schematic/main.sch`](file:///c:/Users/Alok/Desktop/MY_PROEJCT/Healthcare-IoE/schematic/main.sch) and [`wiring/wiring.json`](file:///c:/Users/Alok/Desktop/MY_PROEJCT/Healthcare-IoE/wiring/wiring.json).

---

## 🛠️ Summary of Audit Improvements & Fixes

Every subsystem has been thoroughly audited, verified against the circuit schematic, and tested end-to-end:

1. **Firmware Timing & Non-Blocking Conversions:**
   * Converted DS18B20 to asynchronous non-blocking conversion (`setWaitForConversion(false)`), eliminating ~750ms CPU blocking and ensuring uninterrupted buzzer drive and instantaneous SOS button debouncing.
   * Fixed `max30102Check()` ternary evaluation bug to properly validate part IDs (`0x15` and `0x11`).
   * Added 85°C power-on reset filtering and extended Wi-Fi DHCP retry lease to 16 cycles (8s) with dynamic serial logging.
   * Maintained 100% byte-for-byte synchronization between PlatformIO (`src/main.cpp`) and Arduino IDE (`HealthMonitor/HealthMonitor.ino`).

2. **Backend Engine & API Resilience:**
   * Implemented smart alert latching and **WATCH $\rightarrow$ CRITICAL escalation**: updates existing alerts in-place to prevent database flooding while seamlessly escalating severity without inflating active alert counts.
   * Extended telemetry timestamp validation to the full 32-bit unsigned range (`0` to `4,294,967,295`) for ESP32 `millis()`.
   * Added complete patient management APIs (`GET/POST /api/v1/patients/`, `GET/PATCH /api/v1/patients/<id_or_device>/`) and central alert feed (`GET /api/v1/alerts/`).
   * Implemented strict multi-patient isolation with intelligent prototype fallback: verifies patient existence first so registered patients with 0 readings never leak another patient's data; safely falls back for unconfigured single-node prototypes only when `count == 1`. Covered by 9 automated tests.

3. **Frontend Dashboard ("CareSense IoE"):**
   * Audited React 19 + Vite dashboard: resolved all static analysis and lifecycle warnings (`npm run lint` yields 0 warnings, 0 errors).
   * Verified live end-to-end telemetry rendering, Recharts heart rate trend plotting, and one-click alert acknowledgment in real time.

4. **Clean Distribution Archive:**
   * A ready-to-deploy, clean zip archive `Healthcare-IoE.zip` is maintained at the project root and parent folder (excluding `venv/`, `node_modules/`, `db.sqlite3`, `dist/`, and cache directories).

---

## 📊 Table 8.4: Project Report Implementation Matrix

This table summarizes the alignment between the specifications/wireframes in Chapters 7, 8, and 9 of the project report and the actual implementation in this repository.

| Report Reference | Feature / Specification Claimed | Prototype Status | Implementation Details & Verifications |
|---|---|---|---|
| **Fig 7.1** | Login Screen (Doctor / Caregiver / Admin role tabs, OTP footnote) | **Fully Implemented** | Split-screen layout in `Frontend/src/components/Login.jsx` with navy hero panel, clinical quote, role toggle tabs, demo credentials, and authentication against `POST /api/v1/auth/login/`. |
| **Fig 7.2** | Left Navigation Sidebar (Dashboard, Live Vitals, Patients, Alerts, Reports, Settings) | **Fully Implemented** | Navy sidebar in `Frontend/src/components/Sidebar.jsx` with active state highlights, notification badge counts, and user profile badge (`Dr. Mehta / Doctor`). |
| **Fig 7.2** | Multi-Patient Selector Strip (Ward Overview) | **Fully Implemented** | Horizontal patient strip in `Frontend/src/components/PatientSelector.jsx` with 4 patients (`Rahul Sharma` [PT-0142 Live], `Anita Rao`, `S. Iyer`, `Fatima K.`), status indicators, and ward switching. |
| **Fig 7.2** | 4 Vital Sign Cards (SpO2, Heart Rate, Body Temp, Motion/Fall) | **Fully Implemented** | Real-time sensor cards in `Frontend/src/components/VitalCard.jsx` displaying live readings, normal ranges, and dynamic threshold status badges. |
| **Fig 7.2** | Vital Trend Charts & Recent Alert Log | **Fully Implemented** | Dual-panel layout in `Frontend/src/components/HeartRateChart.jsx` and `AlertLog.jsx` with real-time SVG curve, threshold line (120 BPM), and one-click alert acknowledgment. |
| **Fig 7.2** | Patient Reading History Table | **Fully Implemented** | Last 5 readings table in `Frontend/src/components/HistoryTable.jsx` displaying timestamp, heart rate, SpO2, temperature, and motion status. |
| **Fig 7.3** | Full-Screen Emergency Alert Modal | **Fully Implemented** | High-contrast emergency modal in `Frontend/src/components/EmergencyModal.jsx` with abnormal readings box, `CALL PATIENT NOW`, `VIEW LIVE VITALS`, `ACKNOWLEDGE ALERT`, and delivery dispatch note. |
| **Table 8.2** | `POST /api/v1/vitals/` (Telemetry ingestion) | **Fully Implemented** | Ingests ESP32 telemetry with anti-flooding, in-place alert updates, full 32-bit unsigned `timestamp` range, and auto-provisioning. |
| **Table 8.2** | `GET /api/v1/patients/` & `GET /api/v1/patients/<id>/` | **Fully Implemented** | Patient listing and retrieval with dual-identifier lookup (ID or `device_id`) and safe prototype fallback. |
| **Table 8.2** | `POST /api/v1/auth/login/` (Role-based authentication) | **Fully Implemented** | `AuthLoginView` validates Doctor/Caregiver/Admin credentials and returns authenticated user object with role and session token. |
| **Table 8.2** | `GET/PATCH /api/v1/patients/<id>/thresholds/` | **Fully Implemented** | Dedicated endpoint `PatientThresholdsView` for viewing and tailoring patient vital thresholds (`hr_min`, `hr_max`, `spo2_min`, `temp_max`). |
| **Table 8.2** | `PATCH /api/v1/alerts/<id>/acknowledge/` | **Fully Implemented** | One-click clinical alert acknowledgment updating database state and UI status badge. |
| **Table 8.3** | `Alert.channels_sent` field | **Fully Implemented** | Tracks notification dispatch channels (`SMS, Email and Push Notification`) on alert model and serializer. |
| **Chapter 4** | Physical Sensor Pipeline & Hardware Bus | **Fully Implemented** | DS18B20 (GPIO4, non-blocking), MAX30102 (I2C GPIO21/22), MPU-6050 (I2C GPIO21/22), SOS (GPIO27), Buzzer (GPIO18), 3-color LEDs (GPIO25, 26, 32). |
| **Chapter 9** | Fall Detection & Multi-sensor Fusion Thresholds | **Hardware Prototype Validated** | Vector magnitude threshold calculation (`|a| > 2.5g`) and vital breach detection driving firmware alert states (`NORMAL`, `WATCH`, `CRITICAL`). |

---

## 📁 Repository Structure

```text
Healthcare-IoE/
├── Backend/                    # Django & DRF Backend Service
│   ├── alerts/                 # Alert generation & acknowledgment
│   ├── patients/               # Patient registry & profile management
│   ├── vitals/                 # Telemetry ingestion & vital records
│   ├── healthcare_backend/     # Django settings, WSGI/ASGI, root URLs
│   ├── manage.py               # Django management CLI
│   ├── requirements.txt        # Python package dependencies
│   └── README.md               # Backend-specific documentation
├── Frontend/                   # React + Vite Dashboard ("CareSense IoE")
│   ├── src/                    # Components (VitalCard, HeartRateChart, AlertLog, HistoryTable)
│   ├── public/                 # Static assets & icons
│   ├── package.json            # Dependencies (React, Recharts, Axios)
│   ├── vite.config.js          # Vite configuration
│   └── README.md               # Frontend setup guide
├── HealthMonitor/              # Arduino IDE Firmware
│   ├── HealthMonitor.ino       # Main sketch file
│   └── config.h                # Hardware pins, timings, Wi-Fi config
├── src/                        # PlatformIO Firmware (synchronized with HealthMonitor)
│   ├── main.cpp                # Firmware entry point
│   └── config.h                # Pin & network definitions
├── schematic/                  # Circuit schematic definitions
│   └── main.sch                # JSON schematic symbol & wire maps
├── wiring/                     # Physical layout & simulator wiring
│   └── wiring.json             # Breadboard coordinates and wiring rails
├── docs/                       # Reports and specifications
├── platformio.ini              # PlatformIO build configuration
├── CHANGES-README.md           # Detailed audit and changes log
├── FIX-NOTES.md                # Circuit audit & restoration history
└── README.md                   # Project overview & documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer and npm
- VS Code is recommended; PlatformIO is only needed when flashing the ESP32

The project has two ways to run:

1. **Demo mode:** Run only the frontend. No Django, database, Wi-Fi, or ESP32 is required.
2. **Connected mode:** Run Django and the frontend together. Use this for database persistence, API testing, or ESP32 telemetry.

### 1. Setting Up the Backend (when using Django or hardware)

```powershell
# Navigate to the backend folder
cd Backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\activate       # Windows PowerShell
# source venv/bin/activate    # Linux / macOS

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Add the sample ward patients and demo clinical accounts
python manage.py seed_ward

# Start the local development server
python manage.py runserver
```
The server will start at: `http://127.0.0.1:8000/api/v1/`

For ESP32 access over the laptop's Wi-Fi network, use:

```powershell
python manage.py runserver 0.0.0.0:8000
```

### 2. Setting Up the Frontend Dashboard

```powershell
# Open a new terminal and navigate to the frontend folder
cd Frontend

# Install npm dependencies
npm install

# Start the Vite development server
npm run dev
```
The dashboard will open at: `http://localhost:5173/`

The frontend reads `Frontend/.env` when present. Use `Frontend/.env.example` as the template:

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_PATIENT_ID=1
```

### 3. Running Automated Tests

To verify backend routing, serializer validations, alert anti-flooding, and patient APIs:
```powershell
cd Backend
python manage.py test
```

### 4. Running the Connected Project

Start Django and Vite in two terminals. Sign in through the dashboard using one
of the seeded accounts listed above. The frontend sends the saved DRF token on
clinical API requests. The ESP32 sends telemetry to `POST /api/v1/vitals/`, and
the backend stores readings and creates or updates alerts.

### 5. Flashing the Firmware Later

1. Connect the ESP32 to the laptop with a data-capable USB cable.
2. Open [`src/config.h`](src/config.h) or [`HealthMonitor/config.h`](HealthMonitor/config.h).
3. Set `WIFI_SSID`, `WIFI_PASSWORD`, and `BACKEND_URL`, using the laptop Wi-Fi address (for example, `http://192.168.1.25:8000/api/v1/vitals/`).
4. Keep the laptop and ESP32 on the same Wi-Fi network. USB is used for flashing and serial logs; telemetry uses Wi-Fi.
5. Compile and flash using either:
   * **PlatformIO:** Open workspace in VS Code with PlatformIO, click **Build** -> **Upload**.
   * **Arduino IDE:** Open `HealthMonitor/HealthMonitor.ino`, select board `ESP32 Dev Module`, and click **Upload**.
6. Open Serial Monitor at `115200` and confirm Wi-Fi connection and HTTP `201` responses.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login/` | Role-based authentication (Doctor / Caregiver / Admin) returning user profile and session token |
| `POST` | `/api/v1/vitals/` | Telemetry ingestion endpoint for the ESP32 |
| `GET` | `/api/v1/patients/` | List all registered patients with latest vitals & alert summary |
| `GET` | `/api/v1/patients/<id_or_device>/` | Retrieve patient profile by numeric ID or device string |
| `PATCH` | `/api/v1/patients/<id_or_device>/` | Update patient profile details |
| `GET` | `/api/v1/patients/<id_or_device>/thresholds/` | Retrieve clinical vitals thresholds (`hr_min`, `hr_max`, `spo2_min`, `temp_max`) |
| `PATCH` | `/api/v1/patients/<id_or_device>/thresholds/` | Tailor clinical alert thresholds for a specific patient |
| `GET` | `/api/v1/patients/<id_or_device>/vitals/` | Recent vital history (up to 100 entries) |
| `GET` | `/api/v1/patients/<id_or_device>/alerts/` | Alert history for a specific patient |
| `GET` | `/api/v1/alerts/` | Global alerts feed (filter with `?acknowledged=false`) |
| `POST` | `/api/v1/alerts/<id>/acknowledge/` | Acknowledge an active alert |

---

## 📄 Audit & History Documentation

For full details on recent fixes, non-blocking sensor timing optimizations, and architecture updates:
* [`CHANGES-README.md`](file:///c:/Users/Alok/Desktop/MY_PROEJCT/Healthcare-IoE/CHANGES-README.md): Comprehensive log of firmware & backend logic improvements and test results.
* [`FIX-NOTES.md`](file:///c:/Users/Alok/Desktop/MY_PROEJCT/Healthcare-IoE/FIX-NOTES.md): Hardware audit detailing restoration of the MAX30102 sensor and I2C pull-up resistors.
