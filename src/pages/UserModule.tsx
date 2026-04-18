import React, { useState } from 'react';
import { useStore, type UserRole } from '../store';
import { Plus, Trash2, X, ShieldAlert } from 'lucide-react';

const MAX_USERS = 3;

const UserModule: React.FC = () => {
  const store = useStore();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'salesman' as UserRole, status: 'active' as const });

  const canAddMore = store.users.length < MAX_USERS;

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddMore) return;
    store.addUser(newUser);
    setNewUser({ name: '', email: '', password: '', role: 'salesman', status: 'active' });
    setIsAddingUser(false);
  };

  const getRoleUrdu = (role: string) => {
    switch (role) {
      case 'admin': return 'ایڈمن (Admin)';
      case 'accountant': return 'اکاؤنٹنٹ (Accountant)';
      case 'salesman': return 'سیلز مین (Salesman)';
      default: return role;
    }
  };

  const getRoleAccess = (role: string) => {
    switch (role) {
      case 'admin': return 'Full access — all modules';
      case 'accountant': return 'All modules except User Management';
      case 'salesman': return 'All modules except User Management';
      default: return '';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>یوزر مینجمنٹ (User Management)</h2>
          <p>Manage system access. Maximum {MAX_USERS} users allowed.</p>
        </div>
      </div>

      {/* User limit banner */}
      <div className="glass-card" style={{
        padding: '14px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: canAddMore ? 'rgba(52,199,89,0.06)' : 'rgba(255,59,48,0.06)',
        border: `1px solid ${canAddMore ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.2)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={18} style={{ color: canAddMore ? 'var(--green)' : 'var(--red)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {store.users.length} / {MAX_USERS} users created
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {canAddMore
              ? `— ${MAX_USERS - store.users.length} slot(s) remaining`
              : '— Maximum limit reached. Delete a user to add a new one.'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[...Array(MAX_USERS)].map((_, i) => (
            <div key={i} style={{
              width: 12, height: 12, borderRadius: '50%',
              background: i < store.users.length ? 'var(--blue)' : 'var(--border)',
            }} />
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-header" style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.2rem' }}>سسٹم یوزرز (System Users)</h3>
          <button
            className="btn btn-primary"
            onClick={() => setIsAddingUser(true)}
            disabled={!canAddMore}
            title={!canAddMore ? `Maximum ${MAX_USERS} users allowed` : 'Add new user'}
            style={{ opacity: canAddMore ? 1 : 0.5, cursor: canAddMore ? 'pointer' : 'not-allowed' }}
          >
            <Plus size={16} /> Add User (نیا یوزر)
          </button>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>User (یوزر)</th>
                <th>Username (یوزر نیم)</th>
                <th>Role (عہدہ)</th>
                <th>Access (رسائی)</th>
                <th>Status (سٹیٹس)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {store.users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: u.role === 'admin' ? 'rgba(255,59,48,0.1)' : u.role === 'accountant' ? 'rgba(0,122,255,0.1)' : 'rgba(52,199,89,0.1)',
                        color: u.role === 'admin' ? 'var(--red)' : u.role === 'accountant' ? 'var(--blue)' : 'var(--green)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '0.8rem',
                      }}>
                        {u.name.substring(0, 1).toUpperCase()}
                      </div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'red' : u.role === 'accountant' ? 'blue' : 'green'}`}>
                      {getRoleUrdu(u.role)}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{getRoleAccess(u.role)}</td>
                  <td>
                    <span className={`badge ${u.status === 'active' ? 'green' : 'orange'}`}>
                      {u.status === 'active' ? 'فعال (Active)' : 'غیر فعال (Inactive)'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="topbar-icon-btn"
                      style={{ color: 'var(--red)' }}
                      onClick={() => { if (confirm(`Delete user "${u.name}"?`)) store.deleteUser(u.id); }}
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {store.users.length === 0 && (
                <tr><td colSpan={6} className="empty-state">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddingUser && canAddMore && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add User (نیا یوزر)</h3>
              <button className="topbar-icon-btn" onClick={() => setIsAddingUser(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name (نام)</label>
                  <input className="form-control" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Username / Login ID (لاگ ان آئی ڈی)</label>
                  <input type="text" className="form-control" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="e.g. aslam123" />
                </div>
                <div className="form-group">
                  <label>Role (عہدہ)</label>
                  <select className="form-control" required value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
                    <option value="admin">ایڈمن (Admin) — Full access</option>
                    <option value="accountant">اکاؤنٹنٹ (Accountant) — All except Users</option>
                    <option value="salesman">سیلز مین (Salesman) — All except Users</option>
                  </select>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    {newUser.role === 'admin'
                      ? '✓ Full access to all modules including User Management'
                      : '✓ Access to Dashboard, Suppliers, Customers, Accounts, Reports — no User Management'}
                  </p>
                </div>
                <div className="form-group">
                  <label>Set Password (پاسورڈ)</label>
                  <input type="text" required placeholder="Enter password..." className="form-control" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div style={{ background: 'var(--background)', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Slot {store.users.length + 1} of {MAX_USERS} will be used after adding this user.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsAddingUser(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserModule;
