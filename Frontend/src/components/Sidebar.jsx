import React from 'react';
import {
  IconDashboard,
  IconActivity,
  IconUsers,
  IconBellRing,
  IconFileText,
  IconSettings,
  IconUser,
  IconLogOut,
  IconHeartPulse,
} from './Icons';

export default function Sidebar({
  activeTab,
  onTabChange,
  user,
  onLogout,
  activeAlertsCount = 0,
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
    { id: 'live-vitals', label: 'Live Vitals', Icon: IconActivity },
    { id: 'patients', label: 'Patients', Icon: IconUsers },
    { id: 'alerts', label: 'Alerts', Icon: IconBellRing, badge: activeAlertsCount },
    { id: 'reports', label: 'Reports', Icon: IconFileText },
    { id: 'settings', label: 'Settings', Icon: IconSettings },
  ];

  const roleTag = (user?.role || 'DOCTOR').toUpperCase();
  const roleDisplay = roleTag === 'DOCTOR' ? 'Doctor' : (roleTag === 'NURSE' ? 'Nurse' : 'Admin');
  const roleClass = `role-badge-${roleTag.toLowerCase()}`;

  return (
    <>
      {/* Desktop Fixed Left Navigation Sidebar (>= 1024px) */}
      <aside className="clinical-sidebar" aria-label="Clinical Navigation">
        {/* Brand Header */}
        <div className="sidebar-brand-block">
          <div className="brand-logo-mark">
            <IconHeartPulse size={20} color="#ffffff" />
          </div>
          <div className="brand-text-block">
            <span className="brand-title">CareSense IoE</span>
            <span className="brand-badge-sub">PATIENT MONITORING</span>
          </div>
        </div>

        {/* System Central Status Chip */}
        <div className="sidebar-status-chip">
          <span className="telemetry-live-dot" />
          <span className="telemetry-status-text">Ward A Monitoring Active</span>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav-list" aria-label="Main Navigation">
          {navItems.map((item) => {
            const ItemIcon = item.Icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-btn ${isActive ? 'nav-active' : ''}`}
                onClick={() => onTabChange(item.id)}
              >
                <span className="nav-icon-wrapper" aria-hidden="true">
                  <ItemIcon size={18} />
                </span>
                <span className="nav-label-text">{item.label}</span>
                {item.badge > 0 && (
                  <span className="nav-alert-counter tabular-nums" aria-label={`${item.badge} active incidents`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <span className="active-rail-indicator" />}
              </button>
            );
          })}
        </nav>

        {/* Clinician Profile Footer */}
        <div className="sidebar-user-section">
          <div className="user-profile-tile">
            <div className="user-avatar-circle">
              <IconUser size={18} />
            </div>
            <div className="user-text-column">
              <span className="user-display-name">{user?.display_name || user?.name || 'Dr. Mehta'}</span>
              <span className={`user-role-pill ${roleClass}`}>{roleDisplay}</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={onLogout}
            title="Terminate session and sign out"
          >
            <IconLogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (< 1024px) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {navItems.map((item) => {
          const ItemIcon = item.Icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-btn ${isActive ? 'mobile-active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <div className="mobile-icon-box">
                <ItemIcon size={20} />
                {item.badge > 0 && (
                  <span className="mobile-alert-pip tabular-nums">{item.badge}</span>
                )}
              </div>
              <span className="mobile-btn-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
