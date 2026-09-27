import React, { useState, useEffect, useRef } from 'react';
import {
  IconSearch,
  IconDashboard,
  IconActivity,
  IconUsers,
  IconBellRing,
  IconFileText,
  IconSettings,
  IconAlertOctagon,
  IconUser,
  IconX,
} from './Icons';

export default function CommandPalette({
  isOpen,
  onClose,
  patients = [],
  onSelectPatient,
  onNavigateTab,
  onTriggerEmergency,
  onToggleTheme,
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(false); // toggle handled by parent
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Navigation targets
  const navTargets = [
    { id: 'dashboard', label: 'Dashboard — Central Telemetry Overview', icon: IconDashboard },
    { id: 'live-vitals', label: 'Live Vitals — Sensor Waveform & Instruments', icon: IconActivity },
    { id: 'patients', label: 'Patients — Ward Bed Registry', icon: IconUsers },
    { id: 'alerts', label: 'Alerts — Incident & Audit Trail', icon: IconBellRing },
    { id: 'reports', label: 'Reports — Shift Analytics & Handoff', icon: IconFileText },
    { id: 'settings', label: 'Settings — Threshold Calibration & Simulator', icon: IconSettings },
  ].filter((n) => !q || n.label.toLowerCase().includes(q));

  // Matching patients
  const matchingPatients = patients.filter((p) => {
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.room || '').toLowerCase().includes(q) ||
      (p.device_id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="command-palette-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="command-palette-box" onClick={(e) => e.stopPropagation()}>
        <div className="command-input-row">
          <IconSearch size={18} className="palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search patient by name or bed, or jump to tab… (ESC to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="palette-close-btn" onClick={handleClose}>
            <IconX size={16} />
          </button>
        </div>

        <div className="command-results-list">
          {/* Quick Actions */}
          <div className="command-group-heading">Clinical Actions</div>
          <button
            type="button"
            className="command-item-btn"
            onClick={() => {
              onTriggerEmergency();
              onClose();
            }}
          >
            <IconAlertOctagon size={16} color="var(--status-danger)" />
            <span>Simulate Emergency Code Blue Takeover</span>
            <kbd className="command-kbd">EMERGENCY</kbd>
          </button>
          <button
            type="button"
            className="command-item-btn"
            onClick={() => {
              onToggleTheme();
              onClose();
            }}
          >
            <IconActivity size={16} color="var(--brand-primary)" />
            <span>Toggle Clinical Light / Dark Ward Mode</span>
            <kbd className="command-kbd">THEME</kbd>
          </button>

          {/* Navigation Items */}
          {navTargets.length > 0 && (
            <>
              <div className="command-group-heading">Navigation Tabs</div>
              {navTargets.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="command-item-btn"
                    onClick={() => {
                      onNavigateTab(item.id);
                      onClose();
                    }}
                  >
                    <ItemIcon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </>
          )}

          {/* Patients */}
          {matchingPatients.length > 0 && (
            <>
              <div className="command-group-heading">Ward Patients</div>
              {matchingPatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="command-item-btn"
                  onClick={() => {
                    onSelectPatient(p.id);
                    onNavigateTab('dashboard');
                    onClose();
                  }}
                >
                  <IconUser size={16} color="var(--brand-primary)" />
                  <span>
                    <strong>{p.name}</strong> — Bed {p.room || `PT-014${p.id}`} ({p.device_id})
                  </span>
                  <span className="command-sub-badge">{p.connection_status || 'ONLINE'}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
