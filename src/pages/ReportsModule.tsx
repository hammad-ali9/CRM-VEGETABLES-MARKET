import React, { useState } from 'react';
import { useStore, calcSupplierBalance, calcCustomerBalance, calcSaleNet, calcSaleCommission, calcSaleCashWari } from '../store';
import { Printer } from 'lucide-react';
import { openPrintWindow } from '../utils/printTemplate';

const ReportsModule: React.FC = () => {
  const store = useStore();
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(lastDayOfMonth);
  const [activeReport, setActiveReport] = useState<'pnl' | 'remainings'>('pnl');

  const fmt = (n: number) => `Rs. ${(n || 0).toLocaleString()}`;

  // ── Period filter using date range ──
  const isWithinPeriod = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    
    // Extract just the date part (YYYY-MM-DD)
    const dateOnly = dateStr.slice(0, 10);
    
    // Compare dates as strings (YYYY-MM-DD format)
    return dateOnly >= startDate && dateOnly <= endDate;
  };

  // ── P&L Calculations ──
  // Supplier revenue = labour charges + carriage
  const periodSupplierLabour = store.suppliers.reduce((s, sup) =>
    s + sup.trucks.filter(t => isWithinPeriod(t.loadingDate)).reduce((ss, t) =>
      ss + (t.labourCharges ?? 0), 0), 0);

  const periodSupplierCarriage = store.suppliers.reduce((s, sup) =>
    s + sup.trucks.filter(t => isWithinPeriod(t.loadingDate)).reduce((ss, t) =>
      ss + (t.carriage ?? 0), 0), 0);

  // Customer revenue = commission + wari
  const periodCustomerComm = store.customers.reduce((s, c) =>
    s + c.sales.filter(sl => isWithinPeriod(sl.date)).reduce((ss, sl) =>
      ss + calcSaleCommission(sl), 0), 0);

  const periodCustomerWari = store.customers.reduce((s, c) =>
    s + c.sales.filter(sl => isWithinPeriod(sl.date)).reduce((ss, sl) =>
      ss + calcSaleCashWari(sl), 0), 0);

  // Total agency revenue = supplier revenue + customer revenue
  const periodRevenue = periodSupplierLabour + periodSupplierCarriage + periodCustomerComm + periodCustomerWari;

  const periodTotalPurchases = store.suppliers.reduce((s, sup) =>
    s + sup.trucks.filter(t => isWithinPeriod(t.loadingDate)).reduce((ss, t) =>
      ss + t.parties.reduce((ps, p) => ps + p.crates * p.rate, 0), 0), 0);

  const periodTotalSales = store.customers.reduce((s, c) =>
    s + c.sales.filter(sl => isWithinPeriod(sl.date)).reduce((ss, sl) =>
      ss + sl.crates * sl.rate, 0), 0);

  const periodTruckCount = store.suppliers.reduce((s, sup) =>
    s + sup.trucks.filter(t => isWithinPeriod(t.loadingDate)).length, 0);

  const periodExpenses = store.expenses
    .filter(e => isWithinPeriod(e.date))
    .reduce((s, e) => s + e.amount, 0);

  const periodProfit = periodRevenue - periodExpenses;
  const periodCharity = Math.round(Math.max(0, periodProfit) * 0.10);
  const periodAfterCharity = periodProfit - periodCharity;
  const periodInvestorShare = Math.round(store.investors.reduce((s, inv) => s + Math.max(0, periodAfterCharity) * inv.sharePercent / 100, 0));
  const periodNetProfit = periodAfterCharity - periodInvestorShare;

  // ── Remainings (all-time balances) ──
  const suppliersWithBalance = store.suppliers
    .filter(s => calcSupplierBalance(s) !== 0)
    .map(s => ({ type: 'بیوپاری', name: s.name, city: s.city, balance: calcSupplierBalance(s) }));

  const customersWithBalance = store.customers
    .filter(c => calcCustomerBalance(c) !== 0)
    .map(c => ({ type: 'خریدار', name: c.name, city: c.nickname, balance: calcCustomerBalance(c) }));

  const allRemainings = [...suppliersWithBalance, ...customersWithBalance]
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  const totalPayable = suppliersWithBalance.filter(s => s.balance > 0).reduce((s, x) => s + x.balance, 0);
  const totalReceivable = customersWithBalance.filter(c => c.balance > 0).reduce((s, x) => s + x.balance, 0);

  const handleExportPDF = () => {
    const periodLabel = `${startDate} تا ${endDate}`;

    if (activeReport === 'pnl') {
      // Combine supplier and customer transactions
      const supplierRows: string[][] = store.suppliers.flatMap(sup =>
        sup.trucks.filter(t => isWithinPeriod(t.loadingDate)).flatMap(t => {
          const totalCratesT = t.parties.reduce((sum, pp) => sum + pp.crates, 0);
          return t.parties.map(p => {
            const partyLabour = totalCratesT > 0 ? Math.round((t.labourCharges ?? 0) * p.crates / totalCratesT) : 0;
            const partyCarriage = totalCratesT > 0 ? Math.round((t.carriage ?? 0) * p.crates / totalCratesT) : 0;
            return [
              sup.name, t.loadingDate, t.truckNo, String(p.crates),
              `Rs. ${p.rate.toLocaleString()}`,
              `Rs. ${(p.crates * p.rate).toLocaleString()}`,
              `Rs. ${partyLabour.toLocaleString()}`,
              `Rs. ${partyCarriage.toLocaleString()}`,
              `Rs. ${((p.crates * p.rate) - partyLabour - partyCarriage).toLocaleString()}`,
              'بیوپاری',
            ];
          });
        })
      );

      const customerRows: string[][] = store.customers.flatMap(c =>
        c.sales.filter(s => isWithinPeriod(s.date)).map(s => [
          c.name, s.date, s.billNo || '', String(s.crates),
          `Rs. ${s.rate.toLocaleString()}`,
          `Rs. ${(s.crates * s.rate).toLocaleString()}`,
          `Rs. ${calcSaleCommission(s).toLocaleString()}`,
          `Rs. ${calcSaleCashWari(s).toLocaleString()}`,
          `Rs. ${calcSaleNet(s).toLocaleString()}`,
          'خریدار',
        ])
      );

      const salesRows = [...supplierRows, ...customerRows].sort((a, b) => (b[1] || '').localeCompare(a[1] || ''));

      openPrintWindow({
        title: 'منافع و نقصان رپورٹ',
        subtitle: `آمدنی: Rs. ${periodRevenue.toLocaleString()} | اخراجات: Rs. ${periodExpenses.toLocaleString()} | خالص منافع: Rs. ${periodNetProfit.toLocaleString()}`,
        periodLabel,
        columns: [
          { label: 'نام' },
          { label: 'تاریخ' },
          { label: 'حوالہ' },
          { label: 'کریٹس', align: 'right' },
          { label: 'ریٹ', align: 'right' },
          { label: 'کل رقم', align: 'right' },
          { label: 'مزدوری/کمیشن', align: 'right' },
          { label: 'لاگا/واری', align: 'right' },
          { label: 'خالص', align: 'right' },
          { label: 'قسم' },
        ],
        rows: salesRows,
        summaryRows: [
          { label: 'کل خریداری', value: `Rs. ${periodTotalPurchases.toLocaleString()}` },
          { label: 'کل فروخت', value: `Rs. ${periodTotalSales.toLocaleString()}` },
          { label: 'کل آمدنی', value: `Rs. ${periodRevenue.toLocaleString()}`, color: '#16a34a' },
          { label: 'کل اخراجات', value: `Rs. ${periodExpenses.toLocaleString()}`, color: '#dc2626' },
          { label: '۱۰٪ صدقہ', value: `Rs. ${periodCharity.toLocaleString()}`, color: '#d97706' },
          { label: 'انویسٹر حصہ', value: `Rs. ${periodInvestorShare.toLocaleString()}`, color: '#7c3aed' },
          { label: 'خالص منافع', value: `Rs. ${periodNetProfit.toLocaleString()}`, bold: true, color: periodNetProfit >= 0 ? '#16a34a' : '#dc2626' },
        ],
        emptyMessage: 'اس دور میں کوئی ریکارڈ نہیں',
      });
    } else {
      // Remainings report
      const rows: string[][] = allRemainings.map(e => [
        e.type, e.name, e.city ?? '',
        e.type === 'بیوپاری'
          ? (e.balance > 0 ? 'دینا ہے' : 'پیشگی دی گئی')
          : (e.balance > 0 ? 'لینا ہے' : 'صاف'),
        `Rs. ${Math.abs(e.balance).toLocaleString()}`,
      ]);

      openPrintWindow({
        title: 'بقایا جات',
        subtitle: `${allRemainings.length} فعال بقایا`,
        periodLabel: 'کل وقت',
        columns: [
          { label: 'قسم' },
          { label: 'نام' },
          { label: 'شہر' },
          { label: 'سٹیٹس' },
          { label: 'بقایہ', align: 'right' },
        ],
        rows,
        summaryRows: [
          { label: 'بیوپاریوں کو دینا ہے', value: `Rs. ${totalPayable.toLocaleString()}`, color: '#dc2626' },
          { label: 'خریداروں سے لینا ہے', value: `Rs. ${totalReceivable.toLocaleString()}`, color: '#16a34a' },
          { label: 'خالص پوزیشن', value: `Rs. ${(totalReceivable - totalPayable).toLocaleString()}`, bold: true, color: (totalReceivable - totalPayable) >= 0 ? '#16a34a' : '#dc2626' },
        ],
        emptyMessage: 'کوئی بقایا نہیں',
      });
    }
  };

  return (
    <div>
      {/* Print-only header */}
      <div className="print-header" style={{ marginBottom: 24, borderBottom: '2px solid #000', paddingBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Abbasi & Co — Tomato Trading</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13 }}>
          {activeReport === 'pnl' ? 'Profit & Loss Report' : 'Remaining Balances'}
          {' — '}{startDate} to {endDate} | Printed: {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="page-header">
        <div>
          <h2>رپورٹس (Reports)</h2>
          <p>Profit & Loss, Remaining Balances, Cash Flow</p>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', background: 'var(--card-bg)', padding: 12, borderRadius: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>From:</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.9rem' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>To:</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.9rem' }} />
            </div>
          </div>
          <button className="btn btn-secondary" onClick={handleExportPDF}>
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab ${activeReport === 'pnl' ? 'active' : ''}`} onClick={() => setActiveReport('pnl')}>منافع اور نقصان (P&L)</button>
        <button className={`tab ${activeReport === 'remainings' ? 'active' : ''}`} onClick={() => setActiveReport('remainings')}>بقایا جات (Remainings)</button>
      </div>

      {/* ── P&L ── */}
      {activeReport === 'pnl' && (
        <>
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>کل خریداری (Purchases)</p>
              <h3 style={{ margin: 0 }}>{fmt(periodTotalPurchases)}</h3>
              <p style={{ fontSize: '0.65rem', color: 'var(--blue)', marginTop: 4 }}>{periodTruckCount} Truck(s)</p>
            </div>
            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>کل فروخت (Sales)</p>
              <h3 style={{ margin: 0, color: 'var(--blue)' }}>{fmt(periodTotalSales)}</h3>
            </div>
            <div className="glass-card" style={{ padding: 20, background: 'rgba(52,199,89,0.05)' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--green)', textTransform: 'uppercase', marginBottom: 4 }}>کل آمدنی (Total Revenue)</p>
              <h3 style={{ margin: 0, color: 'var(--green)' }}>{fmt(periodRevenue)}</h3>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Sup.Labour {fmt(periodSupplierLabour)} + Carriage {fmt(periodSupplierCarriage)} + Cust.Comm {fmt(periodCustomerComm)} + Wari {fmt(periodCustomerWari)}
              </p>
            </div>
            <div className="glass-card" style={{ padding: 20, background: 'rgba(255,59,48,0.05)' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 4 }}>اخراجات (Expenses)</p>
              <h3 style={{ margin: 0, color: 'var(--red)' }}>{fmt(periodExpenses)}</h3>
            </div>
          </div>

          <div className="content-grid cols-2" style={{ marginBottom: 24 }}>
            <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>بقیہ منافع (Net Profit)</p>
              <h1 style={{ fontSize: '2.5rem', color: periodNetProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {fmt(periodNetProfit)}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 8 }}>
                Gross Profit: {fmt(periodProfit)} — 10% Charity: {fmt(periodCharity)} — Investor Share: {fmt(periodInvestorShare)}
              </p>
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: 16 }}>Revenue Breakdown (آمدنی کی تفصیل)</h4>
              <div className="summary-row">
                <span className="label">Supplier Labour (مزدوری)</span>
                <span className="value green">{fmt(periodSupplierLabour)}</span>
              </div>
              <div className="summary-row">
                <span className="label">Supplier Carriage (لاگا)</span>
                <span className="value green">{fmt(periodSupplierCarriage)}</span>
              </div>
              <div className="summary-row">
                <span className="label">Customer Commission (7.25%)</span>
                <span className="value green">{fmt(periodCustomerComm)}</span>
              </div>
              <div className="summary-row">
                <span className="label">Customer Wari (نقد واری)</span>
                <span className="value green">{fmt(periodCustomerWari)}</span>
              </div>
              <div className="summary-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                <span className="label" style={{ fontWeight: 700 }}>Total Revenue</span>
                <span className="value green" style={{ fontWeight: 700 }}>{fmt(periodRevenue)}</span>
              </div>
              <div className="summary-row">
                <span className="label" style={{ color: 'var(--red)' }}>Total Expenses</span>
                <span className="value" style={{ color: 'var(--red)' }}>-{fmt(periodExpenses)}</span>
              </div>
              <div className="summary-row">
                <span className="label" style={{ color: 'var(--orange)' }}>10% Charity (صدقہ)</span>
                <span className="value" style={{ color: 'var(--orange)' }}>-{fmt(periodCharity)}</span>
              </div>
            </div>
          </div>

          {/* Detailed sales table */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 16 }}>فروخت کی تفصیل (Sales Detail)</h4>
            <div className="table-wrapper">
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Mode</th>
                    <th>Crates</th>
                    <th>Rate</th>
                    <th>Gross</th>
                    <th>Commission</th>
                    <th>Wari</th>
                    <th>Net Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {store.customers.flatMap(c =>
                    c.sales.filter(s => isWithinPeriod(s.date)).map(s => ({ ...s, customerName: c.name }))
                  ).sort((a, b) => b.date.localeCompare(a.date)).map((s, idx) => (
                    <tr key={idx}>
                      <td>{s.date}</td>
                      <td style={{ fontWeight: 500 }}>{s.customerName}</td>
                      <td>
                        {s.paymentMode === 'Cash'
                          ? <span className="badge orange" style={{ fontSize: '0.7rem' }}>Cash</span>
                          : <span className="badge blue" style={{ fontSize: '0.7rem' }}>Credit</span>}
                      </td>
                      <td>{s.crates}</td>
                      <td>{fmt(s.rate)}</td>
                      <td>{fmt(s.crates * s.rate)}</td>
                      <td style={{ color: 'var(--green)' }}>{fmt(calcSaleCommission(s))}</td>
                      <td style={{ color: 'var(--green)' }}>{fmt(calcSaleCashWari(s))}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(calcSaleNet(s))}</td>
                    </tr>
                  ))}
                  {store.customers.every(c => c.sales.filter(s => isWithinPeriod(s.date)).length === 0) && (
                    <tr><td colSpan={9} className="empty-state">No sales in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Remainings ── */}
      {activeReport === 'remainings' && (
        <>
          <div className="stats-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="glass-card" style={{ padding: 20, background: 'rgba(255,59,48,0.05)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 4 }}>Payable to Suppliers (بیوپاری کو دینا ہے)</p>
              <h3 style={{ margin: 0, color: 'var(--red)' }}>{fmt(totalPayable)}</h3>
            </div>
            <div className="glass-card" style={{ padding: 20, background: 'rgba(52,199,89,0.05)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--green)', textTransform: 'uppercase', marginBottom: 4 }}>Receivable from Customers (خریداروں سے لینا ہے)</p>
              <h3 style={{ margin: 0, color: 'var(--green)' }}>{fmt(totalReceivable)}</h3>
            </div>
          </div>

          <div className="glass-card">
            <div className="table-header">
              <h3>بقایا جات کی لسٹ (Remainings List)</h3>
              <span className="badge orange">{allRemainings.length} Active</span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name (نام)</th>
                    <th>City / Nickname</th>
                    <th>Status</th>
                    <th>Balance (بقایہ)</th>
                  </tr>
                </thead>
                <tbody>
                  {allRemainings.map((entity, i) => {
                    const isSupplier = entity.type === 'بیوپاری';
                    const color = isSupplier
                      ? (entity.balance > 0 ? 'var(--red)' : 'var(--green)')
                      : (entity.balance > 0 ? 'var(--orange)' : 'var(--green)');
                    const status = isSupplier
                      ? (entity.balance > 0 ? 'Payable (دینا ہے)' : 'Advance Given')
                      : (entity.balance > 0 ? 'Receivable (لینا ہے)' : 'Clear');
                    return (
                      <tr key={i}>
                        <td><span className={`badge ${isSupplier ? 'blue' : 'green'}`}>{entity.type}</span></td>
                        <td style={{ fontWeight: 600 }}>{entity.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{entity.city}</td>
                        <td style={{ color }}>{status}</td>
                        <td><span style={{ color, fontWeight: 700 }}>{fmt(Math.abs(entity.balance))}</span></td>
                      </tr>
                    );
                  })}
                  {allRemainings.length === 0 && (
                    <tr><td colSpan={5} className="empty-state">کوئی بقایا جات نہیں (All clear)</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}


    </div>
  );
};

export default ReportsModule;
