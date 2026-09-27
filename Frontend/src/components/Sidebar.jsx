import {
  IconDashboard,
  IconActivity,
  IconUsers,
  IconBell,
  IconFileText,
  IconSettings,
  IconUser,
} from './Icons';

export default function Sidebar({ activeTab, onTabChange, user, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
    { id: 'live-vitals', label: 'Live Vitals', Icon: IconActivity },
    { id: 'patients', label: 'Patients', Icon: IconUsers },
    { id: 'alerts', label: 'Alerts', Icon: IconBell },
    { id: 'reports', label: 'Reports', Icon: IconFileText },
    { id: 'settings', label: 'Settings', Icon: IconSettings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-dot" aria-hidden="true">+</span>
        <span className="brand-name">CareSense</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main Navigation">
        {navItems.map((item) => {
          const ItemIcon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span className="nav-icon" aria-hidden="true">
                <ItemIcon size={16} />
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-badge">
          <span className="user-avatar" aria-hidden="true">
            <IconUser size={18} />
          </span>
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
