import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';

function CustomClinicalTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const hrItem = payload.find((p) => p.dataKey === 'heartRate');
  const spo2Item = payload.find((p) => p.dataKey === 'spo2');

  const hr = hrItem ? Number(hrItem.value) : null;
  const spo2 = spo2Item ? Number(spo2Item.value) : null;

  let hrStatus = 'Normal';
  let hrStatusColor = 'var(--status-ok)';
  if (hr !== null) {
    if (hr > 120) {
      hrStatus = 'Tachycardia';
      hrStatusColor = 'var(--status-danger)';
    } else if (hr < 50) {
      hrStatus = 'Bradycardia';
      hrStatusColor = 'var(--status-warning)';
    }
  }

  let spo2Status = 'Optimal';
  let spo2StatusColor = 'var(--status-ok)';
  if (spo2 !== null && spo2 < 92) {
    spo2Status = 'Hypoxia';
    spo2StatusColor = 'var(--status-danger)';
  }

  return (
    <div className="clinical-chart-tooltip">
      <div className="tooltip-timestamp tabular-nums">{label}</div>
      <div className="tooltip-metrics">
        {hr !== null && (
          <div className="tooltip-metric-row">
            <span className="tooltip-indicator hr-dot" />
            <span className="tooltip-label">Heart Rate:</span>
            <span className="tooltip-val tabular-nums">{hr.toFixed(0)} BPM</span>
            <span className="tooltip-tag" style={{ color: hrStatusColor, borderColor: hrStatusColor }}>
              {hrStatus}
            </span>
          </div>
        )}
        {spo2 !== null && (
          <div className="tooltip-metric-row">
            <span className="tooltip-indicator spo2-dot" />
            <span className="tooltip-label">SpO2:</span>
            <span className="tooltip-val tabular-nums">{spo2.toFixed(1)}%</span>
            <span className="tooltip-tag" style={{ color: spo2StatusColor, borderColor: spo2StatusColor }}>
              {spo2Status}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HeartRateChart({ vitals = [] }) {
  const [metricMode, setMetricMode] = useState('both'); // 'hr' | 'spo2' | 'both'
  const [timeWindow, setTimeWindow] = useState('15m'); // '15m' | '1h' | '6h' | '24h'

  const chartData = useMemo(() => {
    if (!vitals || vitals.length === 0) return [];

    let count = 20;
    if (timeWindow === '15m') count = 25;
    else if (timeWindow === '1h') count = 50;
    else if (timeWindow === '6h') count = 80;
    else count = 120;

    return [...vitals]
      .slice(0, count)
      .reverse()
      .map((v) => {
        const d = new Date(v.received_at);
        const timeStr = d.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const isHrBreach = v.heart_rate > 120 || v.heart_rate < 50;
        const isSpo2Breach = v.spo2 < 92;

        return {
          time: timeStr,
          rawTime: d.getTime(),
          heartRate: Number(v.heart_rate),
          spo2: Number(v.spo2),
          isHrBreach,
          isSpo2Breach,
          source: v.source || 'hardware',
        };
      });
  }, [vitals, timeWindow]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-empty-state">
        <span className="chart-empty-msg">Awaiting continuous biometric telemetry stream…</span>
      </div>
    );
  }

  return (
    <div className="clinical-chart-wrapper">
      {/* Chart Control Toolbar */}
      <div className="chart-controls-bar">
        <div className="chart-mode-segmented">
          <button
            type="button"
            className={`chart-segment-btn ${metricMode === 'both' ? 'active' : ''}`}
            onClick={() => setMetricMode('both')}
          >
            Dual Vitals
          </button>
          <button
            type="button"
            className={`chart-segment-btn ${metricMode === 'hr' ? 'active' : ''}`}
            onClick={() => setMetricMode('hr')}
          >
            Heart Rate (BPM)
          </button>
          <button
            type="button"
            className={`chart-segment-btn ${metricMode === 'spo2' ? 'active' : ''}`}
            onClick={() => setMetricMode('spo2')}
          >
            SpO2 (%)
          </button>
        </div>

        <div className="chart-window-pills">
          {['15m', '1h', '6h', '24h'].map((tw) => (
            <button
              key={tw}
              type="button"
              className={`time-window-pill ${timeWindow === tw ? 'active' : ''}`}
              onClick={() => setTimeWindow(tw)}
            >
              {tw}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-body" style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="hrAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="spo2AreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              minTickGap={28}
            />

            {/* Left YAxis: Heart Rate */}
            {(metricMode === 'hr' || metricMode === 'both') && (
              <YAxis
                yAxisId="hrAxis"
                domain={[40, 160]}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                unit=" bpm"
              />
            )}

            {/* Right YAxis: SpO2 */}
            {(metricMode === 'spo2' || metricMode === 'both') && (
              <YAxis
                yAxisId="spo2Axis"
                orientation="right"
                domain={[80, 100]}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
            )}

            <Tooltip content={<CustomClinicalTooltip />} />

            {/* Normal Range Reference Bands */}
            {(metricMode === 'hr' || metricMode === 'both') && (
              <>
                <ReferenceArea
                  yAxisId="hrAxis"
                  y1={50}
                  y2={120}
                  fill="rgba(5, 150, 105, 0.05)"
                  stroke="none"
                />
                <ReferenceLine
                  yAxisId="hrAxis"
                  y={120}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: '120 BPM High',
                    position: 'insideTopRight',
                    fill: '#ef4444',
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  yAxisId="hrAxis"
                  y={50}
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  strokeWidth={1.2}
                  label={{
                    value: '50 BPM Low',
                    position: 'insideBottomRight',
                    fill: '#d97706',
                    fontSize: 10,
                  }}
                />
              </>
            )}

            {(metricMode === 'spo2' || metricMode === 'both') && (
              <ReferenceLine
                yAxisId="spo2Axis"
                y={92}
                stroke="#dc2626"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: '92% Hypoxia',
                  position: 'insideTopLeft',
                  fill: '#dc2626',
                  fontSize: 10,
                }}
              />
            )}

            {/* Data Series */}
            {(metricMode === 'hr' || metricMode === 'both') && (
              <Area
                yAxisId="hrAxis"
                type="monotone"
                dataKey="heartRate"
                stroke="#0284c7"
                strokeWidth={2}
                fill="url(#hrAreaGrad)"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.isHrBreach) {
                    return (
                      <circle
                        key={`dot-hr-${payload.time}`}
                        cx={cx}
                        cy={cy}
                        r={4.5}
                        fill="#dc2626"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    );
                  }
                  return null;
                }}
                activeDot={{ r: 5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {(metricMode === 'spo2' || metricMode === 'both') && (
              <Line
                yAxisId="spo2Axis"
                type="monotone"
                dataKey="spo2"
                stroke="#059669"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.isSpo2Breach) {
                    return (
                      <circle
                        key={`dot-spo2-${payload.time}`}
                        cx={cx}
                        cy={cy}
                        r={4.5}
                        fill="#dc2626"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    );
                  }
                  return null;
                }}
                activeDot={{ r: 5, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-legend-footer">
        <div className="legend-items">
          {(metricMode === 'hr' || metricMode === 'both') && (
            <span className="legend-chip">
              <span className="legend-color-dot" style={{ background: '#0284c7' }} />
              Heart Rate (50–120 BPM Target)
            </span>
          )}
          {(metricMode === 'spo2' || metricMode === 'both') && (
            <span className="legend-chip">
              <span className="legend-color-dot" style={{ background: '#059669' }} />
              SpO2 Blood Oxygen (≥92% Safe)
            </span>
          )}
          <span className="legend-chip">
            <span className="legend-color-dot" style={{ background: '#dc2626' }} />
            Threshold Breaches
          </span>
        </div>
        <span className="chart-origin-note">Live Continuous Stream (5s Interval)</span>
      </div>
    </div>
  );
}
