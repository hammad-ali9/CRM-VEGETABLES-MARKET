import React, { useState } from 'react';
import { useStore, type Expense, type Investor, type Partner } from '../store';
import { DollarSign, TrendingDown, Heart, PieChart, Plus, Edit2, Trash2, X, Search } from 'lucide-react';

const AccountsModule: React.FC = () => {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'investors' | 'partners'>('overview');

  // Modal states for Add/Edit Expense
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({ date: '', type: 'food' as any, amount: 0, notes: '' });

  // Modal states for Add/Edit Investor
  const [isInvestorModalOpen, setIsInvestorModalOpen] = useState(false);
  const [editingInvestorId, setEditingInvestorId] = useState<string | null>(null);
  const [investorForm, setInvestorForm] = useState({ name: '', investment: 0, sharePercent: 0 });

  // Modal states for Add/Edit Partner
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerForm, setPartnerForm] = useState({ name: '', sharePercent: 0 });

  const [searchQuery, setSearchQuery] = useState('');

  const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

  // ===================== EXPENSE HANDLERS =====================
  const openAddExpense = () => {
    setEditingExpenseId(null);
    setExpenseForm({ date: new Date().toISOString().split('T')[0], type: 'food', amount: 0, notes: '' });
    setIsExpenseModalOpen(true);
  };

  const openEditExpense = (e: Expense) => {
    setEditingExpenseId(e.id);
    setExpenseForm({ date: e.date, type: e.type, amount: e.amount, notes: e.notes });
    setIsExpenseModalOpen(true);
  };

  const saveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpenseId) {
      store.updateExpense(editingExpenseId, expenseForm);
    } else {
      store.addExpense({ ...expenseForm, addedBy: store.activeUser?.name || 'Admin', addedAtStr: new Date().toLocaleString() });
    }
    setIsExpenseModalOpen(false);
  };

  // ===================== INVESTOR HANDLERS =====================
  const openAddInvestor = () => {
    setEditingInvestorId(null);
    setInvestorForm({ name: '', investment: 0, sharePercent: 0 });
    setIsInvestorModalOpen(true);
  };

  const openEditInvestor = (inv: Investor) => {
    setEditingInvestorId(inv.id);
    setInvestorForm({ name: inv.name, investment: inv.investment, sharePercent: inv.sharePercent });
    setIsInvestorModalOpen(true);
  };

  const saveInvestor = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInvestorId) {
      store.updateInvestor(editingInvestorId, investorForm);
    } else {
      store.addInvestor(investorForm);
    }
    setIsInvestorModalOpen(false);
  };

  // ===================== PARTNER HANDLERS =====================
  const openAddPartner = () => {
    setEditingPartnerId(null);
    setPartnerForm({ name: '', sharePercent: 0 });
    setIsPartnerModalOpen(true);
  };

  const openEditPartner = (p: Partner) => {
    setEditingPartnerId(p.id);
    setPartnerForm({ name: p.name, sharePercent: p.sharePercent });
    setIsPartnerModalOpen(true);
  };

  const savePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPartnerId) {
      store.updatePartner(editingPartnerId, partnerForm);
    } else {
      store.addPartner(partnerForm);
    }
    setIsPartnerModalOpen(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>کمپنی اکاؤنٹس (Company Accounts)</h2>
          <p>Manage expenses, calculate profits, and distribute shares.</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>پرافٹ کیلکولیشن (Overview)</button>
        <button className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>روزانہ اخراجات (Daily Expenses)</button>
        <button className={`tab ${activeTab === 'investors' ? 'active' : ''}`} onClick={() => setActiveTab('investors')}>انویسٹرز (Investors)</button>
        <button className={`tab ${activeTab === 'partners' ? 'active' : ''}`} onClick={() => setActiveTab('partners')}>پارٹنر (Partners)</button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card green">
              <div className="stat-icon green"><DollarSign size={22} /></div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 4 }}>کل آمدنی (Total Revenue)</p>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{fmt(store.totalRevenue)}</h3>
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-icon red"><TrendingDown size={22} /></div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 4 }}>کل اخراجات (Total Expenses)</p>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{fmt(store.totalExpenses)}</h3>
              </div>
            </div>
            <div className="stat-card orange">
              <div className="stat-icon orange"><Heart size={22} /></div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 4 }}>10% خودکار صدقہ (Charity)</p>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{fmt(store.charity)}</h3>
              </div>
            </div>
            <div className="stat-card blue">
              <div className="stat-icon blue"><PieChart size={22} /></div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 4 }}>بقیہ منافع (Net Profit)</p>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{fmt(store.netProfit)}</h3>
              </div>
            </div>
          </div>

          {/* Full profit breakdown */}
          <div className="content-grid cols-2" style={{ marginBottom: 24 }}>
            <div className="summary-panel">
              <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>منافع کا حساب (Profit Calculation)</h3>
              <div className="summary-row">
                <span className="label">Supplier Labour (مزدوری)</span>
                <span className="value green">{fmt(store.totalSupplierLabour)}</span>
              </div>
              <div className="summary-row">
                <span className="label">Supplier Carriage (لاگا)</span>
                <span className="value green">{fmt(store.totalSupplierCarriage)}</span>
              </div>
              <div className="summary-row">
                <span className="label">Customer Commission (7.25%)</span>
                <span className="value green">{fmt(store.totalCustomerComm)}</span>
              </div>
              <div className="summary-row">
                <span className="label">Customer Wari (نقد واری)</span>
                <span className="value green">{fmt(store.totalCustomerWari)}</span>
              </div>
              <div className="summary-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                <span className="label" style={{ fontWeight: 700 }}>Total Revenue (کل آمدنی)</span>
                <span className="value green" style={{ fontWeight: 700 }}>{fmt(store.totalRevenue)}</span>
              </div>
              <div className="summary-row">
                <span className="label" style={{ color: 'var(--red)' }}>Expenses (اخراجات)</span>
                <span className="value" style={{ color: 'var(--red)' }}>-{fmt(store.totalExpenses)}</span>
              </div>
              <div className="summary-row">
                <span className="label" style={{ color: 'var(--orange)' }}>10% Charity (صدقہ)</span>
                <span className="value" style={{ color: 'var(--orange)' }}>-{fmt(store.charity)}</span>
              </div>
              <div className="summary-row">
                <span className="label" style={{ color: 'var(--blue)' }}>Investor Shares</span>
                <span className="value" style={{ color: 'var(--blue)' }}>-{fmt(store.totalInvestorShare)}</span>
              </div>
              <div className="summary-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                <span className="label" style={{ fontWeight: 700, fontSize: '1rem' }}>Net Profit (خالص منافع)</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: store.netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(store.netProfit)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="summary-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>انویسٹر کی تقسیم (Investor Distribution)</h3>
                {store.investors.map(inv => {
                  const shareProfit = Math.round(Math.max(0, store.afterCharity) * inv.sharePercent / 100);
                  return (
                    <div key={inv.id} className="summary-row">
                      <span className="label">{inv.name} <span style={{ fontSize: '0.75rem' }}>({inv.sharePercent}%)</span></span>
                      <span className="value green">{fmt(shareProfit)}</span>
                    </div>
                  );
                })}
                {store.investors.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No investors added.</p>}
              </div>

              <div className="summary-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>پارٹنر کی تقسیم (Partner Distribution)</h3>
                {store.partners.map(p => {
                  const shareProfit = Math.round(Math.max(0, store.afterCharity) * p.sharePercent / 100);
                  return (
                    <div key={p.id} className="summary-row">
                      <span className="label">{p.name} <span style={{ fontSize: '0.75rem' }}>({p.sharePercent}%)</span></span>
                      <span className="value blue">{fmt(shareProfit)}</span>
                    </div>
                  );
                })}
                {store.partners.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No partners added.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================= EXPENSES TAB ======================= */}
      {activeTab === 'expenses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
                <Search className="search-icon" size={15} />
                <input 
                  placeholder="Search expenses by notes, amount, or type..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            <button className="btn btn-primary" onClick={openAddExpense}>
              <Plus size={16} /> Add Expense (اخراجات شامل کریں)
            </button>
          </div>
          <div className="content-grid cols-3">
            {store.expenses.filter(e => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return e.notes.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.amount.toString().includes(q);
            }).map(e => (
              <div key={e.id} className="glass-card" style={{ padding: 20 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                   <div>
                     <span className="badge red" style={{ textTransform: 'capitalize', marginBottom: 8, display: 'inline-block' }}>
                        {e.type === 'food' ? 'فوڈ بل' : e.type === 'salary' ? 'تنخواہیں' : e.type === 'rent' ? 'دکان کا کرایہ' : e.type === 'parking' ? 'پارکنگ فیس' : 'Other'}
                     </span>
                     <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--red)' }}>{fmt(e.amount)}</h3>
                   </div>
                   <div style={{ display: 'flex', gap: 6 }}>
                     <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => openEditExpense(e)}><Edit2 size={14}/></button>
                     <button className="btn btn-secondary" style={{ padding: 6, color: 'var(--red)' }} onClick={() => store.deleteExpense(e.id)}><Trash2 size={14}/></button>
                   </div>
                 </div>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 4 }}><strong>تاریخ:</strong> {e.date}</p>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 4 }}><strong>نوٹس:</strong> {e.notes}</p>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}><strong>درج شدہ از (Added By):</strong> {e.addedBy}</p>
              </div>
            ))}
            {store.expenses.length === 0 && <p style={{ gridColumn: 'span 3', textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>کوئی اخراجات نہیں (No expenses recorded)</p>}
          </div>
        </div>
      )}

      {/* ======================= INVESTORS TAB ======================= */}
      {activeTab === 'investors' && (
        <div>
           <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
             <button className="btn btn-primary" onClick={openAddInvestor}>
               <Plus size={16} /> Add Investor (انویسٹر شامل کریں)
             </button>
           </div>
           <div className="content-grid cols-3">
              {store.investors.map(i => {
                const profitCalc = Math.round((store.netProfit * i.sharePercent) / 100);
                return (
                <div key={i.id} className="glass-card" style={{ padding: 20 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                     <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{i.name}</h3>
                     <div style={{ display: 'flex', gap: 6 }}>
                       <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => openEditInvestor(i)}><Edit2 size={14}/></button>
                       <button className="btn btn-secondary" style={{ padding: 6, color: 'var(--red)' }} onClick={() => store.deleteInvestor(i.id)}><Trash2 size={14}/></button>
                     </div>
                   </div>
                   <div className="summary-row" style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
                     <span className="label">سرمایہ (Investment)</span>
                     <span style={{ fontWeight: 500 }}>{fmt(i.investment)}</span>
                   </div>
                   <div className="summary-row" style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
                     <span className="label">شیئر (Share %)</span>
                     <span style={{ fontWeight: 500 }}>{i.sharePercent}%</span>
                   </div>
                   <div className="summary-row">
                     <span className="label" style={{ fontWeight: 600 }}>منافع (Auto Profit)</span>
                     <span className="value green" style={{ fontSize: '1.1rem' }}>{fmt(profitCalc)}</span>
                   </div>
                </div>
              )})}
              {store.investors.length === 0 && <p style={{ gridColumn: 'span 3', textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>کوئی انویسٹر نہیں (No investors added)</p>}
           </div>
        </div>
      )}

      {/* ======================= PARTNERS TAB ======================= */}
      {activeTab === 'partners' && (
        <div>
           <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
             <button className="btn btn-primary" onClick={openAddPartner}>
               <Plus size={16} /> Add Partner (پارٹنر شامل کریں)
             </button>
           </div>
           <div className="content-grid cols-3">
              {store.partners.map(p => {
                const profitCalc = Math.round((store.netProfit * p.sharePercent) / 100);
                return (
                <div key={p.id} className="glass-card" style={{ padding: 20 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                     <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{p.name}</h3>
                     <div style={{ display: 'flex', gap: 6 }}>
                       <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => openEditPartner(p)}><Edit2 size={14}/></button>
                       <button className="btn btn-secondary" style={{ padding: 6, color: 'var(--red)' }} onClick={() => store.deletePartner(p.id)}><Trash2 size={14}/></button>
                     </div>
                   </div>
                   <div className="summary-row" style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
                     <span className="label">شیئر (Share %)</span>
                     <span style={{ fontWeight: 500 }}>{p.sharePercent}%</span>
                   </div>
                   <div className="summary-row">
                     <span className="label" style={{ fontWeight: 600 }}>منافع (Auto Profit)</span>
                     <span className="value blue" style={{ fontSize: '1.1rem' }}>{fmt(profitCalc)}</span>
                   </div>
                </div>
              )})}
              {store.partners.length === 0 && <p style={{ gridColumn: 'span 3', textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>کوئی پارٹنر نہیں (No partners added)</p>}
           </div>
        </div>
      )}

      {/* ======================= MODALS ======================= */}

      {/* EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingExpenseId ? 'Edit Expense (ترمیم کریں)' : 'Add Expense (نیا اخراجات)'}</h3>
              <button className="topbar-icon-btn" onClick={() => setIsExpenseModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveExpense}>
               <div className="modal-body form-grid cols-2">
                 <div className="form-group">
                   <label>Date (تاریخ)</label>
                   <input type="date" className="form-control" required value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                 </div>
                 <div className="form-group">
                   <label>روزانہ اخراجات (Expense Type)</label>
                   <select className="form-control" required value={expenseForm.type} onChange={e => setExpenseForm({...expenseForm, type: e.target.value as any})}>
                     <option value="food">فوڈ بل (Food Bills)</option>
                     <option value="salary">تنخواہیں (Salaries)</option>
                     <option value="rent">دکان کا کرایہ (Shop Rent)</option>
                     <option value="parking">پارکنگ فیس (Parking Fees)</option>
                     <option value="other">دیگر (Other)</option>
                   </select>
                 </div>
                 <div className="form-group">
                   <label>Amount (رقم)</label>
                   <input type="number" className="form-control" required value={expenseForm.amount || ''} onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})} />
                 </div>
                 <div className="form-group">
                   <label>Added By</label>
                   <input className="form-control" readOnly value={store.activeUser?.name || 'Admin'} />
                 </div>
                 <div className="form-group" style={{ gridColumn: 'span 2' }}>
                   <label>Notes (نوٹس)</label>
                   <input className="form-control" value={expenseForm.notes} onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})} />
                 </div>
               </div>
               <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setIsExpenseModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingExpenseId ? 'Update Expense' : 'Save Expense'}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* INVESTOR MODAL */}
      {isInvestorModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingInvestorId ? 'Edit Investor' : 'Add Investor (نیا انویسٹر)'}</h3>
              <button className="topbar-icon-btn" onClick={() => setIsInvestorModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveInvestor}>
               <div className="modal-body">
                 <div className="form-group">
                   <label>Name (نام)</label>
                   <input className="form-control" required value={investorForm.name} onChange={e => setInvestorForm({...investorForm, name: e.target.value})} />
                 </div>
                 <div className="form-group">
                   <label>سرمایہ (Investment Amount)</label>
                   <input type="number" className="form-control" required value={investorForm.investment || ''} onChange={e => setInvestorForm({...investorForm, investment: Number(e.target.value)})} />
                 </div>
                 <div className="form-group">
                   <label>شیئر (Share %)</label>
                   <input type="number" step="0.01" className="form-control" required value={investorForm.sharePercent || ''} onChange={e => setInvestorForm({...investorForm, sharePercent: Number(e.target.value)})} />
                 </div>
               </div>
               <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setIsInvestorModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingInvestorId ? 'Update Investor' : 'Save Investor'}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* PARTNER MODAL */}
      {isPartnerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingPartnerId ? 'Edit Partner' : 'Add Partner (نیا پارٹنر)'}</h3>
              <button className="topbar-icon-btn" onClick={() => setIsPartnerModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={savePartner}>
               <div className="modal-body">
                 <div className="form-group">
                   <label>Name (نام)</label>
                   <input className="form-control" required value={partnerForm.name} onChange={e => setPartnerForm({...partnerForm, name: e.target.value})} />
                 </div>
                 <div className="form-group">
                   <label>شیئر (Share %)</label>
                   <input type="number" step="0.01" className="form-control" required value={partnerForm.sharePercent || ''} onChange={e => setPartnerForm({...partnerForm, sharePercent: Number(e.target.value)})} />
                 </div>
               </div>
               <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setIsPartnerModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingPartnerId ? 'Update Partner' : 'Save Partner'}</button>
               </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AccountsModule;
