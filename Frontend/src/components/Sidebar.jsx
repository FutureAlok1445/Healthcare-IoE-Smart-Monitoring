export default function Sidebar({ activeTab, onTabChange, user, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'live-vitals', label: 'Live Vitals', icon: '💓' },
    { id: 'patients', label: 'Patients', icon: '👥' },
    { id: 'alerts', label: 'Alerts', icon: '🔔' },
    { id: 'reports', label: 'Reports', icon: '📄' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-dot" aria-hidden="true">+</span>
        <span className="brand-name">CareSense</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main Navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-badge">
          <span className="user-avatar" aria-hidden="true">👨‍⚕️</span>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Dr. Mehta'}</span>
            <span className="user-role">{user?.role || 'Doctor'}</span>
          </div>
        </div>
        <button type="button" className="logout-btn" onClick={onLogout} title="Sign out">
          Sign out
        </button>
      </div>
    </aside>
  );
}
