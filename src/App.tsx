import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SupplierModule from './pages/SupplierModule';
import CustomerModule from './pages/CustomerModule';
import AccountsModule from './pages/AccountsModule';
import ReportsModule from './pages/ReportsModule';
import UserModule from './pages/UserModule';
import { useMandiStore, useStore, StoreContext } from './store';
import './App.css';

function AppContent() {
  const store = useStore();
  const [activePage, setActivePage] = useState('dashboard');
  // Persist auth across refreshes — if activeUser is in localStorage, stay logged in
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try { return !!localStorage.getItem('abbasi_active_user'); } catch { return false; }
  });
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = store.users.find(u => u.email === loginId && u.password === password);
    if (user) {
      store.setAndSaveActiveUser(user);
      setIsAuthenticated(true);
      setLoginError('');
    } else if (store.loading) {
      if (loginId === 'admin' && password === '123') {
        store.setAndSaveActiveUser({ id: 'fallback', name: 'Admin (ایڈمن)', email: 'admin', role: 'admin', status: 'active' });
        setIsAuthenticated(true);
        setLoginError('');
      } else {
        setLoginError('ڈیٹا لوڈ ہو رہا ہے، دوبارہ کوشش کریں (Loading, please retry)');
      }
    } else {
      setLoginError('غلط لاگ ان آئی ڈی یا پاسورڈ (Invalid ID or Password)');
    }
  };

  const handleLogout = () => {
    store.setAndSaveActiveUser(null);
    localStorage.removeItem('abbasi_active_user');
    setIsAuthenticated(false);
    setLoginId('');
    setPassword('');
  };

  const renderPage = () => {
    const role = store.activeUser?.role;
    // Non-admins cannot access Users module — redirect to dashboard
    if (activePage === 'users' && role !== 'admin') return <Dashboard />;
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'suppliers': return <SupplierModule />;
      case 'customers': return <CustomerModule />;
      case 'accounts': return <AccountsModule />;
      case 'reports': return <ReportsModule />;
      case 'users': return <UserModule />;
      default: return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="glass-card login-card" style={{ width: '90%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 4, fontSize: '1.4rem' }}>Abbasi & Co</h2>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Tomato Trading Management System</p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '0.8rem' }}>ٹماٹر تجارت مینجمنٹ سسٹم</p>
          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div className="form-group">
              <label>Username / ID (یوزر نیم)</label>
              <input className="form-control" autoFocus required value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="admin" />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label>Password (پاسورڈ)</label>
              <input type="password" className="form-control" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
              {loginError && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: 8 }}>{loginError}</p>}
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
              {store.loading ? 'لوڈ ہو رہا ہے...' : 'لاگ ان کریں (Sign In)'}
            </button>
          </form>
          <p style={{ marginTop: 20, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Default: <strong>admin</strong> / <strong>123</strong></p>
        </div>
      </div>
    );
  }

  return (
    <Layout activePage={activePage} setActivePage={setActivePage} onSignOut={handleLogout} activeUser={store.activeUser}>
      {store.dbError && (
        <div style={{ background: 'var(--red)', color: 'white', padding: '10px 20px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ Database error: {store.dbError}</span>
          <button onClick={() => store.setAndSaveActiveUser(store.activeUser)} style={{ background: 'none', border: '1px solid white', color: 'white', borderRadius: 6, padding: '2px 10px', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}
      {renderPage()}
    </Layout>
  );
}

function App() {
  const store = useMandiStore();
  return (
    <StoreContext.Provider value={store}>
      <AppContent />
    </StoreContext.Provider>
  );
}

export default App;
