import React from 'react';
import { useStore, calcSaleTotal, calcSaleCommission, calcSaleCashWari, calcTruckCashWari, calcSupplierBalance, calcCustomerBalance, calcSupplierGrossTotal, calcSupplierTotalReceived, calcSaleNet, calcTruckCommission } from '../store';
import {
  TrendingUp, DollarSign, Package, Truck, Users,
  BarChart3, Download
} from 'lucide-react';
import { downloadCSV } from '../utils/exportUtils';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const fmt = (n: number) => `Rs. ${(n || 0).toLocaleString()}`;

// Build chart buckets dynamically based on the selected period
function buildChartData(
  period: string,
  customers: ReturnType<typeof useStore>['customers'],
  suppliers: ReturnType<typeof useStore>['suppliers'],
  expenses: ReturnType<typeof useStore>['expenses']
) {
  const now = new Date();

  const calcDayRevenue = (dateStr: string) => {
    const supComm = suppliers.reduce((s, sup) =>
      s + (sup.trucks || []).filter(t => t.loadingDate === dateStr).reduce((ss, t) =>
        ss + calcTruckCommission(t) + calcTruckCashWari(t), 0), 0);
    const custComm = customers.reduce((s, c) =>
      s + (c.sales || []).filter(sl => sl.date === dateStr).reduce((ss, sl) =>
        ss + calcSaleCommission(sl) + calcSaleCashWari(sl), 0), 0);
    return supComm + custComm;
  };

  if (period === 'Today') {
    return Array.from({ length: 24 }, (_, h) => {
      const dateStr = now.toISOString().split('T')[0];
      const sales = customers.reduce((s, c) =>
        s + (c.sales || []).filter(sl => sl.date === dateStr).reduce((ss, sl) => ss + sl.crates * sl.rate, 0), 0);
      const purchases = suppliers.reduce((s, sup) =>
        s + (sup.trucks || []).filter(t => t.loadingDate === dateStr).reduce((ss, t) =>
          ss + (t.parties || []).reduce((ps, p) => ps + p.crates * p.rate, 0), 0), 0);
      const exp = expenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
      return { name: `${h}:00`, sales, purchases, profit: calcDayRevenue(dateStr) - exp };
    });
  }

  if (period === 'This Week') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const sales = customers.reduce((s, c) =>
        s + (c.sales || []).filter(sl => sl.date === dateStr).reduce((ss, sl) => ss + sl.crates * sl.rate, 0), 0);
      const purchases = suppliers.reduce((s, sup) =>
        s + (sup.trucks || []).filter(t => t.loadingDate === dateStr).reduce((ss, t) =>
          ss + (t.parties || []).reduce((ps, p) => ps + p.crates * p.rate, 0), 0), 0);
      const exp = expenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
      return { name: days[d.getDay()], sales, purchases, profit: calcDayRevenue(dateStr) - exp };
    });
  }

  if (period === 'This Month') {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const dateStr = d.toISOString().split('T')[0];
      const sales = customers.reduce((s, c) =>
        s + (c.sales || []).filter(sl => sl.date === dateStr).reduce((ss, sl) => ss + sl.crates * sl.rate, 0), 0);
      const purchases = suppliers.reduce((s, sup) =>
        s + (sup.trucks || []).filter(t => t.loadingDate === dateStr).reduce((ss, t) =>
          ss + (t.parties || []).reduce((ps, p) => ps + p.crates * p.rate, 0), 0), 0);
      const exp = expenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
      return { name: `${i + 1}`, sales, purchases, profit: calcDayRevenue(dateStr) - exp };
    });
  }

  // This Year
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = now.getFullYear();
  return Array.from({ length: 12 }, (_, m) => {
    const sales = customers.reduce((s, c) =>
      s + (c.sales || []).filter(sl => { const d = new Date(sl.date); return d.getFullYear() === year && d.getMonth() === m; })
        .reduce((ss, sl) => ss + sl.crates * sl.rate, 0), 0);
    const purchases = suppliers.reduce((s, sup) =>
      s + (sup.trucks || []).filter(t => { const d = new Date(t.loadingDate); return d.getFullYear() === year && d.getMonth() === m; })
        .reduce((ss, t) => ss + (t.parties || []).reduce((ps, p) => ps + p.crates * p.rate, 0), 0), 0);
    const revenue = suppliers.reduce((s, sup) =>
      s + (sup.trucks || []).filter(t => { const d = new Date(t.loadingDate); return d.getFullYear() === year && d.getMonth() === m; })
        .reduce((ss, t) => ss + calcTruckCommission(t) + calcTruckCashWari(t), 0), 0)
      + customers.reduce((s, c) =>
        s + (c.sales || []).filter(sl => { const d = new Date(sl.date); return d.getFullYear() === year && d.getMonth() === m; })
          .reduce((ss, sl) => ss + calcSaleCommission(sl) + calcSaleCashWari(sl), 0), 0);
    const exp = expenses.filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === m; })
      .reduce((s, e) => s + e.amount, 0);
    return { name: months[m], sales, purchases, profit: revenue - exp };
  });
}

const Dashboard: React.FC = () => {
  const store = useStore();
  const [filterPeriod, setFilterPeriod] = React.useState('This Week');

  if (!store || !store.customers || !store.suppliers) {
    return <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>Loading dashboard data...</div>;
  }

  const isWithinPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    if (filterPeriod === 'Today') return dateStr === now.toISOString().split('T')[0];
    if (filterPeriod === 'This Week') {
      const day = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek && d <= now;
    }
    if (filterPeriod === 'This Month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (filterPeriod === 'This Year') return d.getFullYear() === now.getFullYear();
    return true;
  };

  const periodSales = store.customers.reduce((s, c) =>
    s + (c.sales || []).filter(sl => isWithinPeriod(sl.date)).reduce((ss, sl) => ss + sl.crates * sl.rate, 0), 0);

  const periodPurchases = store.suppliers.reduce((s, sup) =>
    s + (sup.trucks || []).filter(t => isWithinPeriod(t.loadingDate)).reduce((ss, t) =>
      ss + (t.parties || []).reduce((ps, p) => ps + p.crates * p.rate, 0), 0), 0);

  // Full agency revenue = supplier comm + supplier wari + customer comm + customer wari
  const periodSupplierComm = store.suppliers.reduce((s, sup) =>
    s + (sup.trucks || []).filter(t => isWithinPeriod(t.loadingDate)).reduce((ss, t) =>
      ss + calcTruckCommission(t) + calcTruckCashWari(t), 0), 0);
  const periodCustomerComm = store.customers.reduce((s, c) =>
    s + (c.sales || []).filter(sl => isWithinPeriod(sl.date)).reduce((ss, sl) =>
      ss + calcSaleCommission(sl) + calcSaleCashWari(sl), 0), 0);
  const periodRevenue = periodSupplierComm + periodCustomerComm;

  const periodExpenses = store.expenses.filter(e => isWithinPeriod(e.date)).reduce((s, e) => s + e.amount, 0);
  const periodGrossProfit = periodRevenue - periodExpenses;
  const periodCharity = Math.round(Math.max(0, periodGrossProfit) * 0.10);
  const periodAfterCharity = periodGrossProfit - periodCharity;
  // Deduct investor + partner shares
  const periodInvestorShare = Math.round(store.investors.reduce((s, inv) => s + Math.max(0, periodAfterCharity) * inv.sharePercent / 100, 0));
  const periodPartnerShare = Math.round(store.partners.reduce((s, p) => s + Math.max(0, periodAfterCharity) * p.sharePercent / 100, 0));
  const periodNetProfit = periodAfterCharity - periodInvestorShare - periodPartnerShare;

  const totalSupplierBalance = store.suppliers.reduce((s, sp) => s + calcSupplierBalance(sp), 0);
  const totalCustomerBalance = store.customers.reduce((s, c) => s + calcCustomerBalance(c), 0);
  const totalCrates = store.suppliers.reduce((s, sp) =>
    s + (sp.trucks || []).reduce((ss, t) => ss + (t.parties || []).reduce((ps, p) => ps + p.crates, 0), 0), 0);

  const stats = [
    { label: 'کل فروخت (Total Sales)', value: fmt(periodSales), icon: TrendingUp, color: 'blue', sub: `${store.customers.length} customers` },
    { label: 'کل خریداری (Total Purchases)', value: fmt(periodPurchases), icon: Truck, color: 'indigo', sub: `${store.suppliers.reduce((s, sp) => s + (sp.trucks || []).length, 0)} trucks` },
    { label: 'کل آمدنی (Total Revenue)', value: fmt(periodRevenue), icon: DollarSign, color: 'green', sub: 'Comm + Wari (Sup + Cust)' },
    { label: 'خالص منافع (Net Profit)', value: fmt(periodNetProfit), icon: BarChart3, color: periodNetProfit >= 0 ? 'green' : 'red', sub: 'After expenses, charity & shares' },
  ];

  const chartData = buildChartData(filterPeriod, store.customers, store.suppliers, store.expenses);

  // Sort by highest gross total / balance
  const topSuppliers = [...store.suppliers]
    .sort((a, b) => calcSupplierGrossTotal(b) - calcSupplierGrossTotal(a))
    .slice(0, 5)
    .map(s => ({
      name: s.name, city: s.city,
      totalCost: calcSupplierGrossTotal(s),
      received: calcSupplierTotalReceived(s),
      balance: calcSupplierBalance(s),
    }));

  const topCustomers = [...store.customers]
    .sort((a, b) =>
      (b.sales || []).reduce((s, sl) => s + calcSaleNet(sl), 0) -
      (a.sales || []).reduce((s, sl) => s + calcSaleNet(sl), 0)
    )
    .slice(0, 5)
    .map(c => ({
      name: c.name, phone: c.phone,
      totalSales: (c.sales || []).reduce((s, sl) => s + calcSaleTotal(sl), 0),
      balance: calcCustomerBalance(c),
    }));

  const handleExportSuppliers = () => {
    const headers = ['Supplier Name', 'Type', 'Date', 'Ref/Truck No', 'Goods Owner/Method', 'Crates', 'Rate', 'Gross Amount', 'Commission', 'Wari', 'Advance', 'Carriage', 'Net Goods (Credit)', 'Paid/Expense (Debit)'];
    const data = store.suppliers.flatMap(sup => {
      const allRows: any[] = [];
      (sup.trucks || []).forEach(truck => {
        const totalCratesT = (truck.parties || []).reduce((sum, p) => sum + p.crates, 0);
        (truck.parties || []).forEach((party, idx) => {
          const gross = party.crates * party.rate;
          const comm = Math.round(gross * (truck.commPercent ?? 13.6) / 100);
          const wari = party.crates * (truck.wariRate ?? 10);
          const share = totalCratesT > 0 ? party.crates / totalCratesT : 0;
          const allocatedCarriage = Math.round(truck.carriage * share);
          const net = gross - comm - wari - allocatedCarriage;
          allRows.push([sup.name, 'Goods', truck.loadingDate, truck.truckNo, party.personName, party.crates, party.rate, gross, comm, wari, idx === 0 ? truck.advance : 0, allocatedCarriage, net, 0]);
        });
      });
      (sup.payments || []).forEach(p => {
        allRows.push([sup.name, 'Payment', p.date, p.method, 'General Payment', '', '', '', '', '', '', '', 0, p.amount]);
      });
      return allRows;
    }).sort((a, b) => new Date(a[2] as string).getTime() - new Date(b[2] as string).getTime());
    downloadCSV(data, headers, `all_supplier_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportCustomers = () => {
    const headers = ['Customer Name', 'Type', 'Date', 'Ref/Bill No', 'Crates', 'Rate', 'Gross Total', 'Tax/Comm', 'Cash Wari', 'Bill Amount (Debit)', 'Advance Payment', 'Paid Amount (Credit)', 'Final Payment'];
    const data = store.customers.flatMap(cust => {
      const sales = (cust.sales || []).map(s => {
        const billAmt = calcSaleNet(s);
        const adv = s.advance ?? 0;
        return [cust.name, 'Sale', s.date, s.billNo, s.crates, s.rate, calcSaleTotal(s), calcSaleCommission(s), calcSaleCashWari(s), billAmt, adv, 0, billAmt - adv];
      });
      const payments = (cust.payments || []).map(p => [cust.name, 'Payment', p.date, p.method, '', '', '', '', '', 0, 0, p.amount, -p.amount]);
      return [...sales, ...payments];
    }).sort((a, b) => new Date(a[2] as string).getTime() - new Date(b[2] as string).getTime());
    downloadCSV(data, headers, `all_customer_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>منڈی ڈیش بورڈ (Mandi-CRM Dashboard)</h2>
          <p>Welcome back — here's your business overview</p>
        </div>
        <div className="page-actions">
          <select className="filter-select" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
            <option value="Today">Today (آج)</option>
            <option value="This Week">This Week (اس ہفتے)</option>
            <option value="This Month">This Month (اس مہینے)</option>
            <option value="This Year">This Year (اس سال)</option>
          </select>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className={`stat-card ${stat.color}`}>
            <div className={`stat-icon ${stat.color}`}>
              <stat.icon size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 4 }}>{stat.label}</p>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{stat.value}</h3>
              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                {stat.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Info Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="stat-icon purple"><Truck size={20} /></div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>بیوپاری بقایا (Supplier Balance)</p>
            <h4 style={{ fontSize: '1.1rem', color: totalSupplierBalance > 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(totalSupplierBalance)}</h4>
          </div>
        </div>
        <div className="glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="stat-icon blue"><Users size={20} /></div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>خریدار بقایا (Customer Balance)</p>
            <h4 style={{ fontSize: '1.1rem', color: totalCustomerBalance > 0 ? 'var(--orange)' : 'var(--green)' }}>{fmt(totalCustomerBalance)}</h4>
          </div>
        </div>
        <div className="glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="stat-icon orange"><Package size={20} /></div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>کل کریٹس (Total Crates)</p>
            <h4 style={{ fontSize: '1.1rem' }}>{totalCrates.toLocaleString()}</h4>
          </div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Sales vs Purchases (خرید و فروخت)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="name" stroke="#86868b" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#86868b" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'white', borderRadius: 12, border: '1px solid #e5e5ea', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                formatter={(value: any) => [fmt(value as number), '']}
              />
              <Bar dataKey="sales" name="Sales" fill="#34c759" radius={[6, 6, 0, 0]} />
              <Bar dataKey="purchases" name="Purchases" fill="#007aff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>منافع اور نقصان (Profit & Loss)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34c759" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#34c759" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="name" stroke="#86868b" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#86868b" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'white', borderRadius: 12, border: '1px solid #e5e5ea', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                formatter={(value: any) => [fmt(value as number), 'Profit']}
              />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#34c759" strokeWidth={2.5} fill="url(#profitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tables ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-header">
            <h3 style={{ fontSize: '1rem' }}>ٹاپ بیوپاری (Top Suppliers)</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="topbar-icon-btn" title="Export All Suppliers" onClick={handleExportSuppliers}><Download size={14} /></button>
              <span className="badge blue">{store.suppliers.length} total</span>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Total Cost</th>
                  <th>Received</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {topSuppliers.length > 0 ? topSuppliers.map((s, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.city}</div>
                    </td>
                    <td>{fmt(s.totalCost)}</td>
                    <td style={{ color: 'var(--green)' }}>{fmt(s.received)}</td>
                    <td><span style={{ color: s.balance > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{fmt(s.balance)}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="empty-state">No suppliers yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-header">
            <h3 style={{ fontSize: '1rem' }}>ٹاپ خریدار (Top Customers)</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="topbar-icon-btn" title="Export All Customers" onClick={handleExportCustomers}><Download size={14} /></button>
              <span className="badge green">{store.customers.length} total</span>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name (نام)</th>
                  <th>Phone (فون)</th>
                  <th>Sales (فروخت)</th>
                  <th>Balance (بقایہ)</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.length > 0 ? topCustomers.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.phone}</td>
                    <td>{fmt(c.totalSales)}</td>
                    <td><span style={{ color: c.balance > 0 ? 'var(--orange)' : 'var(--green)', fontWeight: 600 }}>{fmt(c.balance)}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="empty-state">No customers yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
