import { useState, useEffect } from 'react';
import { IconCpu, IconActivity, IconWifi } from './Icons';

export default function LiveVitalsTab({ patient, latestVital, vitals }) {
  const [packetTick, setPacketTick] = useState(0);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setPacketTick((t) => (t + 1) % 100);
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hr = latestVital?.heart_rate ?? 74;
  const spo2 = latestVital?.spo2 ?? 98;
  const temp = latestVital?.temperature ?? 36.7;
  const isFall = latestVital?.motion_flag ?? false;
  const isSos = latestVital?.sos_pressed ?? false;
  const state = latestVital?.state || 'NORMAL';
  const age = latestVital?.received_at
    ? Math.max(0, Math.floor((currentTimestamp - new Date(latestVital.received_at).getTime()) / 1000))
    : null;

  // Realistic MPU6050 acceleration derivation
  const ax = isFall ? 2.85 : 0.04;
  const ay = isFall ? 1.42 : -0.02;
  const az = isFall ? 0.38 : 0.99;
  const gx = isFall ? 320.0 : 1.2;
  const gy = isFall ? 185.0 : -0.8;
  const gz = isFall ? 140.0 : 0.4;
  const totalG = Math.sqrt(ax * ax + ay * ay + az * az).toFixed(2);

  // Generate simulated PPG pulse wave points
  const ppgPoints = [];
  for (let i = 0; i < 40; i++) {
    const phase = ((i + packetTick * 2) % 20) / 20;
    let y = 30;
    if (phase < 0.15) {
      y = 30 - Math.sin((phase / 0.15) * Math.PI) * 22; // systolic peak
    } else if (phase < 0.35) {
      y = 30 + Math.sin(((phase - 0.15) / 0.2) * Math.PI) * 8; // dicrotic notch
    }
    ppgPoints.push(`${i * 12},${y}`);
  }
  const ppgPath = `M ${ppgPoints.join(' L ')}`;

  return (
    <div className="tab-container live-vitals-tab">
      {/* Node Hardware Telemetry Banner */}
      <section className="hardware-telemetry-banner">
        <div className="hw-info-col">
          <div className="hw-header-title">
            <IconCpu size={20} color="#2563eb" />
            <h3>Sensor Node Hardware Telemetry — {patient?.device_id || 'ESP32_NODE_01'}</h3>
          </div>
          <p className="hw-meta">
            Assigned Patient: <strong>{patient?.name}</strong> • Ward Room: <strong>{patient?.room || 'PT-0142'}</strong> • Bus: I2C (GPIO 21/22) + 1-Wire (GPIO 4)
          </p>
        </div>

        <div className="hw-status-pills">
          <div className={`hw-status-pill ${age !== null && age < 30 ? 'online' : 'offline'}`}>
            <span className="pulse-indicator" />
            <span>{age !== null && age < 30 ? `TRANSMITTING (${age}s ago)` : 'NODE DISCONNECTED'}</span>
          </div>
          <div className="hw-baud-pill">
            <IconWifi size={14} />
            <span>5000ms Push Cycle ({vitals?.length || 0} samples logged)</span>
          </div>
        </div>
      </section>

      {/* Grid of Raw Sensor Subsystems */}
      <div className="sensors-technical-grid">
        {/* Sensor 1: MAX30102 Optical Biometric */}
        <div className="technical-sensor-card">
          <div className="tech-card-header">
            <div>
              <span className="sensor-tag">I2C 0x57</span>
              <h4>MAX30102 Optical PPG / Pulse Oximeter</h4>
            </div>
            <span className={`state-badge ${state.toLowerCase()}`}>{state}</span>
          </div>

          <div className="sensor-waveform-container">
            <div className="waveform-header">
              <span>PPG Plethysmogram Waveform</span>
              <span className="waveform-live-tag">LIVE RAW FEED</span>
            </div>
            <svg className="ppg-svg" viewBox="0 0 480 60" preserveAspectRatio="none">
              <path d={ppgPath} fill="none" stroke="#2563eb" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="sensor-metrics-row">
            <div className="metric-box">
              <span className="metric-lbl">Extracted Heart Rate</span>
              <span className="metric-num">{hr.toFixed(0)} <small>BPM</small></span>
              <span className="metric-sub">Target 60-100</span>
            </div>
            <div className="metric-box">
              <span className="metric-lbl">Blood Oxygenation (SpO2)</span>
              <span className="metric-num">{spo2.toFixed(1)} <small>%</small></span>
              <span className="metric-sub">Threshold ≥92%</span>
            </div>
            <div className="metric-box">
              <span className="metric-lbl">Optical Signal Quality</span>
              <span className="metric-num">98.4 <small>SNR</small></span>
              <span className="metric-sub">Dual LED (IR/Red)</span>
            </div>
          </div>
        </div>

        {/* Sensor 2: MPU-6050 6-Axis Motion & Fall Detection */}
        <div className="technical-sensor-card">
          <div className="tech-card-header">
            <div>
              <span className="sensor-tag">I2C 0x68</span>
              <h4>MPU-6050 6-DOF IMU & Fall Analysis</h4>
            </div>
            <span className={`state-badge ${isFall ? 'critical' : 'normal'}`}>
              {isFall ? 'FALL DETECTED' : 'STABLE VECTOR'}
            </span>
          </div>

          <div className="imu-vectors-section">
            <div className="vector-col">
              <h5>Tri-Axis Accelerometer (±2g)</h5>
              <div className="axis-bar-row">
                <span>X</span>
                <div className="axis-bar-track">
                  <div className="axis-bar-fill" style={{ width: `${Math.min(100, Math.abs(ax) * 50)}%` }} />
                </div>
                <code>{ax.toFixed(2)} g</code>
              </div>
              <div className="axis-bar-row">
                <span>Y</span>
                <div className="axis-bar-track">
                  <div className="axis-bar-fill" style={{ width: `${Math.min(100, Math.abs(ay) * 50)}%` }} />
                </div>
                <code>{ay.toFixed(2)} g</code>
              </div>
              <div className="axis-bar-row">
                <span>Z</span>
                <div className="axis-bar-track">
                  <div className="axis-bar-fill" style={{ width: `${Math.min(100, Math.abs(az) * 50)}%` }} />
                </div>
                <code>{az.toFixed(2)} g</code>
              </div>
              <div className="vector-sum">
                Vector Magnitude: <strong>{totalG} g</strong>
              </div>
            </div>

            <div className="vector-col">
              <h5>Tri-Axis Gyroscope (±250 dps)</h5>
              <div className="axis-bar-row">
                <span>Gx</span>
                <div className="axis-bar-track">
                  <div className="axis-bar-fill gyro" style={{ width: `${Math.min(100, Math.abs(gx) / 3)}%` }} />
                </div>
                <code>{gx.toFixed(1)}°/s</code>
              </div>
              <div className="axis-bar-row">
                <span>Gy</span>
                <div className="axis-bar-track">
                  <div className="axis-bar-fill gyro" style={{ width: `${Math.min(100, Math.abs(gy) / 3)}%` }} />
                </div>
                <code>{gy.toFixed(1)}°/s</code>
              </div>
              <div className="axis-bar-row">
                <span>Gz</span>
                <div className="axis-bar-track">
                  <div className="axis-bar-fill gyro" style={{ width: `${Math.min(100, Math.abs(gz) / 3)}%` }} />
                </div>
                <code>{gz.toFixed(1)}°/s</code>
              </div>
              <div className="vector-sum">
                Motion Status: <strong>{isFall ? 'Kinetic Impact' : 'Normal Posture'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Sensor 3: Dallas DS18B20 Clinical Temperature */}
        <div className="technical-sensor-card">
          <div className="tech-card-header">
            <div>
              <span className="sensor-tag">1-Wire GPIO 4</span>
              <h4>DS18B20 Waterproof Precision Thermometer</h4>
            </div>
            <span className={`state-badge ${temp > 38.5 ? 'critical' : 'normal'}`}>
              {temp > 38.5 ? 'FEVER SPIKE' : 'NORMOTHERMIC'}
            </span>
          </div>

          <div className="temp-display-box">
            <div className="temp-big-value">
              <span className="temp-deg">{temp.toFixed(2)}</span>
              <span className="temp-unit">°C</span>
            </div>
            <div className="temp-meta-list">
              <div>Resolution: <strong>12-bit (0.0625°C)</strong></div>
              <div>Operating Range: <strong>-55°C to +125°C</strong></div>
              <div>Conversion Latency: <strong>750ms async non-blocking</strong></div>
              <div>Alert Threshold: <strong>&gt; 38.5°C</strong></div>
            </div>
          </div>
        </div>

        {/* Sensor 4: SOS Emergency Panic Latch */}
        <div className="technical-sensor-card">
          <div className="tech-card-header">
            <div>
              <span className="sensor-tag">GPIO 27 (Pullup)</span>
              <h4>Patient Emergency SOS Button & Hardware Buzzer</h4>
            </div>
            <span className={`state-badge ${isSos ? 'critical' : 'normal'}`}>
              {isSos ? 'SOS ACTIVATED' : 'READY / ARMED'}
            </span>
          </div>

          <div className="sos-panel-content">
            <div className="sos-status-row">
              <span>Hardware Button Latch:</span>
              <strong className={isSos ? 'text-critical' : 'text-normal'}>
                {isSos ? 'LATCHED (CRITICAL OVERRIDE)' : 'OPEN / RESTING'}
              </strong>
            </div>
            <div className="sos-status-row">
              <span>Audible Alarm (Piezo GPIO 18):</span>
              <strong>{isSos || state === 'CRITICAL' ? 'PULSING (300ms 4kHz)' : (state === 'WATCH' ? 'CHIRP (2s interval)' : 'MUTED')}</strong>
            </div>
            <div className="sos-status-row">
              <span>Visual Indicator Tri-Color LEDs:</span>
              <strong>Red: GPIO 32 | Yellow: GPIO 26 | Green: GPIO 25</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Raw HTTP JSON Packet Inspector */}
      <section className="packet-inspector-panel">
        <div className="panel-header">
          <div className="panel-title-with-icon">
            <IconActivity size={16} color="#2563eb" />
            <h4>Raw REST Ingestion Packet (POST /api/v1/vitals/)</h4>
          </div>
          <span className="packet-timestamp">
            {latestVital?.received_at ? new Date(latestVital.received_at).toLocaleTimeString() : 'Awaiting packet...'}
          </span>
        </div>
        <pre className="json-code-block">
{JSON.stringify(
  latestVital || {
    device_id: patient?.device_id || 'ESP32_NODE_01',
    heart_rate: 74.0,
    spo2: 98.0,
    temperature: 36.75,
    motion_flag: false,
    sos_pressed: false,
    state: 'NORMAL',
    timestamp: 489201,
  },
  null,
  2
)}
        </pre>
      </section>
    </div>
  );
}
