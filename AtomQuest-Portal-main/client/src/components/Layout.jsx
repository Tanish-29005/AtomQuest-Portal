import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markAllRead } from '../services/api';
import {
  LayoutDashboard, Target, Users,
  Bell, LogOut, Menu, X,
  BarChart3, ClipboardList, Calendar
} from 'lucide-react';

const NAV_CONFIG = {
  employee: [
    { to: '/employee', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/employee/goals', label: 'My Goals', icon: Target },
  ],
  manager: [
    { to: '/manager', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/manager/team', label: 'Team Goals', icon: Users },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/cycle', label: 'Cycle Config', icon: Calendar },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/audit', label: 'Audit Log', icon: ClipboardList },
  ]
};

const ROLE_COLORS = { employee: '#10b981', manager: '#6366f1', admin: '#f59e0b' };
const ROLE_LABELS = { employee: 'Employee', manager: 'Manager', admin: 'Admin' };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = NAV_CONFIG[user?.role] || [];

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const { data } = await getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setUnreadCount(0);
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const closeMobileNav = () => setMobileNavOpen(false);

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="layout">
      <button
        type="button"
        className="mobile-menu-btn"
        aria-label="Open navigation menu"
        aria-expanded={mobileNavOpen}
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
      >
        {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileNavOpen ? 'is-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">A</div>
          <div>
            <div className="sidebar-logo-text">AtomQuest</div>
            <div className="sidebar-logo-sub">Goal Tracking Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMobileNav}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ROLE_COLORS[user?.role], display: 'inline-block' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{ROLE_LABELS[user?.role]}</span>
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, borderRadius: 6 }} title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-meta">
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>{user?.department}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>{user?.designation} · {new Date().getFullYear()} Performance Cycle</p>
          </div>

          <div className="topbar-actions">
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="notification-button"
                aria-label="Open notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="notification-panel">
                  <div className="notification-panel-header">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
                    {unreadCount > 0 && <button className="btn btn-sm btn-secondary" onClick={handleMarkAllRead} style={{ fontSize: 12, padding: '3px 8px' }}>Mark all read</button>}
                  </div>
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>No notifications</div>
                    ) : notifications.map(n => (
                      <div key={n._id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: n.isRead ? 'transparent' : 'rgba(99,102,241,0.04)', cursor: 'pointer' }}
                        onClick={() => { if (n.link) { navigate(n.link); setShowNotifs(false); } }}>
                        <div style={{ fontSize: 13, fontWeight: n.isRead ? 400 : 600 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-user">
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{initials}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{user?.employeeId}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content fade-in">
          {children}
        </main>
      </div>

      <div className={`sidebar-overlay ${mobileNavOpen ? 'is-visible' : ''}`} onClick={closeMobileNav} />
      {showNotifs && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowNotifs(false)} />}
    </div>
  );
}