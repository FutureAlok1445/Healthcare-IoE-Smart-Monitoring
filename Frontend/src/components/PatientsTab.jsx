import React, { useState, useMemo } from 'react';
import {
  IconUsers,
  IconSearch,
  IconFlask,
  IconAlertTriangle,
  IconClock,
  IconHeartPulse,
  IconDroplets,
  IconThermometer,
  IconChevronRight,
} from './Icons';

export default function PatientsTab({
  patients = [],
  selectedPatientId,
  onSelectPatient,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ONLINE' | 'SIMULATED' | 'ALERT' | 'OFFLINE'

  // Summary statistics for ward occupancy
  const stats = useMemo(() => {
    const total = patients.length;
    const online = patients.filter((p) => {
      const cs = (p.connection_status || '').toUpperCase();
      return cs === 'ONLINE' || cs === 'STALE';
    }).length;
    const alerting = patients.filter((p) => Number(p.active_alerts_count || 0) > 0).length;
    const sim = patients.filter((p) => (p.data_source || '').toLowerCase() === 'simulation').length;
    const normal = total - alerting;
    return { total, online, alerting, sim, normal };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchRoom = (p.room || '').toLowerCase().includes(q);
        const matchDevice = (p.device_id || '').toLowerCase().includes(q);
        if (!matchName && !matchRoom && !matchDevice) return false;
      }

      const status = (p.connection_status || 'OFFLINE').toUpperCase();
      const activeAlerts = Number(p.active_alerts_count || 0);
      const isSim =
        (p.data_source || '').toUpperCase() === 'SIMULATION' || status === 'SIMULATED';

      if (statusFilter === 'ONLINE' && status !== 'ONLINE') return false;
      if (statusFilter === 'SIMULATED' && !isSim) return false;
      if (statusFilter === 'ALERT' && activeAlerts === 0) return false;
      if (statusFilter === 'OFFLINE' && status !== 'OFFLINE') return false;

      return true;
    });
  }, [patients, searchQuery, statusFilter]);

  return (
    <div className="patients-tab-container">
      {/* Ward Occupancy Overview Banner */}
      <section className="ward-occupancy-banner">
        <div className="banner-title-block">
          <div className="banner-icon-box">
            <IconUsers size={22} color="var(--brand-primary)" />
          </div>
          <div>
            <h2>Hospital Ward Directory & Registry</h2>
            <p>Real-time status of bed assignments, patient vitals, and ward surveillance.</p>
          </div>
        </div>

        {/* Occupancy Stats Cluster */}
        <div className="ward-kpi-cluster">
          <div className="ward-stat-pill">
            <span className="stat-pill-label">Total Inpatients</span>
            <span className="stat-pill-val tabular-nums">{stats.total} Beds</span>
          </div>
          <div className="ward-stat-pill pill-online">
            <span className="stat-pill-label">Active Monitors</span>
            <span className="stat-pill-val tabular-nums">{stats.online} Beds</span>
          </div>
          <div className="ward-stat-pill pill-alert">
            <span className="stat-pill-label">In Alert</span>
            <span className="stat-pill-val tabular-nums">{stats.alerting} Beds</span>
          </div>
        </div>
      </section>

      {/* Ward Occupancy Distribution Bar */}
      <div className="occupancy-distribution-bar">
        <div className="dist-label-row">
          <span>Ward Bed Occupancy Status (Ward A)</span>
          <span className="tabular-nums">100% Ward Coverage</span>
        </div>
        <div className="dist-bar-track">
          <div
            className="dist-segment seg-online"
            style={{ width: `${Math.max(15, (stats.online / (stats.total || 1)) * 100)}%` }}
            title={`Active Patients: ${stats.online}`}
          />
          <div
            className="dist-segment seg-sim"
            style={{ width: `${(stats.sim / (stats.total || 1)) * 100}%` }}
            title={`Demo Inpatients: ${stats.sim}`}
          />
          {stats.alerting > 0 && (
            <div
              className="dist-segment seg-alert"
              style={{ width: `${(stats.alerting / (stats.total || 1)) * 100}%` }}
              title={`In Alert: ${stats.alerting}`}
            />
          )}
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="patients-toolbar-card">
        <div className="search-box-field">
          <IconSearch size={16} className="search-leading-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name or bed room (e.g. Rahul, Bed 101)…"
            className="patients-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-segmented-pills" role="tablist">
          {[
            { id: 'ALL', label: `All (${patients.length})` },
            { id: 'ONLINE', label: 'Active Monitors' },
            { id: 'SIMULATED', label: 'Demo / Sim' },
            { id: 'ALERT', label: `In Alert (${stats.alerting})` },
            { id: 'OFFLINE', label: 'Standby' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-pill ${statusFilter === tab.id ? 'pill-active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Grid */}
      {filteredPatients.length === 0 ? (
        <div className="patients-empty-state">
          <div className="empty-state-icon">
            <IconUsers size={36} color="var(--text-muted)" />
          </div>
          <h4>No Patients Found</h4>
          <p>No ward inpatient matches the filter or search query "{searchQuery}".</p>
          <button
            type="button"
            className="reset-filters-btn"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="patients-cards-grid">
          {filteredPatients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            const connStatus = (p.connection_status || 'OFFLINE').toUpperCase();
            const isSim =
              (p.data_source || '').toUpperCase() === 'SIMULATION' || connStatus === 'SIMULATED';
            const isOffline = connStatus === 'OFFLINE';
            const activeAlerts = Number(p.active_alerts_count || 0);
            const latest = p.latest_reading;

            // Formatted last seen
            let lastSeenStr = 'Active now';
            if (p.last_seen_seconds !== null && p.last_seen_seconds !== undefined) {
              if (p.last_seen_seconds < 15) lastSeenStr = 'Active now';
              else if (p.last_seen_seconds < 60) lastSeenStr = `${p.last_seen_seconds}s ago`;
              else lastSeenStr = `${Math.floor(p.last_seen_seconds / 60)}m ago`;
            }

            const initials = p.name
              ? p.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
              : 'PT';

            return (
              <div
                key={p.id}
                className={`patient-grid-card ${isSelected ? 'card-monitored' : ''} ${activeAlerts > 0 ? 'card-alerting' : ''}`}
              >
                {/* Card Header */}
                <div className="card-top-row">
                  <div className="patient-identity-cluster">
                    <div className="patient-avatar-box">
                      <span>{initials}</span>
                    </div>
                    <div>
                      <h3 className="patient-name-heading">{p.name}</h3>
                      <span className="room-bed-code">Room {p.room || `Bed ${p.id}`}</span>
                    </div>
                  </div>

                  <span className={`patient-status-chip ${activeAlerts > 0 ? 'chip-alert' : isSim ? 'chip-sim' : isOffline ? 'chip-offline' : 'chip-online'}`}>
                    {activeAlerts > 0 ? (
                      <>
                        <IconAlertTriangle size={11} />
                        <span>In Alert</span>
                      </>
                    ) : isSim ? (
                      <>
                        <IconFlask size={11} />
                        <span>Simulated</span>
                      </>
                    ) : isOffline ? (
                      <>
                        <span className="chip-live-dot chip-dot-muted" />
                        <span>Standby / Offline</span>
                      </>
                    ) : (
                      <>
                        <span className="chip-live-dot" />
                        <span>Continuous Care</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Card Body Specs */}
                <div className="card-meta-section">
                  <div className="meta-item-row">
                    <span className="meta-label">Ward Location:</span>
                    <span className="meta-value-code">
                      <span>Ward A • Bed {p.room || p.id}</span>
                    </span>
                  </div>

                  <div className="meta-item-row">
                    <span className="meta-label">Last Observation:</span>
                    <span className="meta-value-seen tabular-nums">
                      <IconClock size={12} />
                      <span>{lastSeenStr}</span>
                    </span>
                  </div>
                </div>

                {/* Biometric Snapshot Trio */}
                <div className="biometrics-trio-row">
                  <div className="mini-biometric-cell">
                    <span className="bio-label">
                      <IconHeartPulse size={12} color="var(--brand-primary)" />
                      <span>HR</span>
                    </span>
                    <span className="bio-value tabular-nums">
                      {latest?.heart_rate != null ? Number(latest.heart_rate).toFixed(0) : '—'}
                      <small>BPM</small>
                    </span>
                  </div>

                  <div className="mini-biometric-cell">
                    <span className="bio-label">
                      <IconDroplets size={12} color="var(--status-ok)" />
                      <span>SpO2</span>
                    </span>
                    <span className="bio-value tabular-nums">
                      {latest?.spo2 != null ? Number(latest.spo2).toFixed(1) : '—'}
                      <small>%</small>
                    </span>
                  </div>

                  <div className="mini-biometric-cell">
                    <span className="bio-label">
                      <IconThermometer size={12} color="var(--brand-primary)" />
                      <span>Temp</span>
                    </span>
                    <span className="bio-value tabular-nums">
                      {latest?.temperature != null ? Number(latest.temperature).toFixed(1) : '—'}
                      <small>°C</small>
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="card-action-footer">
                  <button
                    type="button"
                    className={`open-telemetry-btn ${isSelected ? 'btn-active-monitored' : ''}`}
                    onClick={() => onSelectPatient(p.id)}
                  >
                    <span>{isSelected ? 'Currently Viewing' : 'View Patient Dashboard'}</span>
                    <IconChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
