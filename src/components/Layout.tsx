import React from 'react';
import {
  LayoutDashboard, Users, Truck, UserCheck, BarChart3,
  DollarSign, Search, Menu, LogOut
} from 'lucide-react';
import { type AppUser } from '../store';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
  onSignOut?: () => void;
  activeUser?: AppUser | null;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage, onSignOut, activeUser }) => {
  const isAdmin = activeUser?.role === 'admin';

  const sections = [
    {
      label: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'ڈیش بورڈ (Dashboard)', icon: LayoutDashboard },
      ],
    },
    {
      label: 'TRADING',
      items: [
        { id: 'suppliers', label: 'بیوپاری (Suppliers)', icon: Truck },
        { id: 'customers', label: 'خریدار (Customers)', icon: Users },
      ],
    },
    {
      label: 'FINANCE',
      items: [
        { id: 'accounts', label: 'کمپنی اکاؤنٹس (Accounts)', icon: DollarSign },
        { id: 'reports', label: 'رپورٹس (Reports)', icon: BarChart3 },
      ],
    },
    // Only show Users section to admins
    ...(isAdmin ? [{
      label: 'SYSTEM',
      items: [
        { id: 'users', label: 'یوزر مینجمنٹ (Users)', icon: UserCheck },
      ],
    }] : []),
  ];

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <DollarSign size={20} />
          </div>
          <h1>Abbasi & Co</h1>
        </div>

        <nav style={{ flex: 1 }}>
          {sections.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => setActivePage(item.id)}
                >
                  <item.icon size={18} />
                  {item.label}
                  {activePage === item.id && <span className="nav-dot" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Logged-in user info */}
          {activeUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 4px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.8rem', color: 'white', flexShrink: 0,
              }}>
                {activeUser.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeUser.name}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', margin: 0, textTransform: 'capitalize' }}>
                  {activeUser.role}
                </p>
              </div>
            </div>
          )}

          {onSignOut && (
            <button className="sidebar-nav-item" style={{ width: '100%', marginBottom: 12, color: 'var(--red)' }} onClick={onSignOut}>
              <LogOut size={18} /> لاگ آؤٹ (Log Out)
            </button>
          )}
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
            © 2026 Abbasi & Co
          </p>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-icon-btn"><Menu size={18} /></button>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              Abbasi & Co — Tomato Trading
            </h3>
          </div>
          <div className="topbar-right">
            <div className="search-bar" style={{ maxWidth: 260 }}>
              <Search className="search-icon" size={15} />
              <input placeholder="Search anything..." />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
