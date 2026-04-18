import React, { useState } from 'react';
import { useStore, calcCustomerBalance, calcCustomerTotalBill, calcCustomerTotalPayments, calcCustomerTotalAdvance, calcCustomerTotalReturns, calcCustomerTotalDiscount, calcSaleTotal, calcSaleCommission, calcSaleCashWari, calcSaleNet, type Customer, type CustomerSale, type CustomerReturn, CASH_WARI_CUSTOMER, CUSTOMER_COMMISSION_PERCENT } from '../store';
import { Plus, ArrowLeft, DollarSign, Phone, Search, X, Edit2, Trash2, Download, Printer } from 'lucide-react';
import { downloadCSV } from '../utils/exportUtils';
import PrintModal from '../components/PrintModal';
import { isWithinPrintPeriod, getPeriodLabel, type PrintPeriod } from '../utils/printUtils';
import { openPrintWindow } from '../utils/printTemplate';
const CustomerModule: React.FC = () => {
  const store = useStore();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Unified Entry State
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [editMode, setEditMode] = useState<'customer' | 'sale' | 'payment' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newEntry, setNewEntry] = useState({
    name: '', phone: '', nickname: '',
    commPercent: CUSTOMER_COMMISSION_PERCENT, wariRate: CASH_WARI_CUSTOMER,
  });

  // Multiple purchases — like parties in supplier
  const [purchases, setPurchases] = useState([{
    id: Math.random().toString(),
    date: new Date().toISOString().split('T')[0],
    crates: 0, totalValue: 0, billNo: '',
    advance: 0, advanceMethod: 'Cash' as 'Cash' | 'Credit',
    discount: 0, paymentMode: 'Credit' as 'Cash' | 'Credit',
  }]);

  const [entryPayments, setEntryPayments] = useState([{ id: Math.random().toString(), amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash' as 'Cash' | 'Credit' | 'Bank' }]);

  // Return modal state
  const [returnModal, setReturnModal] = useState<{ open: boolean; editing: CustomerReturn | null }>({ open: false, editing: null });
  const [returnForm, setReturnForm] = useState({ date: new Date().toISOString().split('T')[0], crates: 0, originalCost: 0, newCost: 0, remarks: '' });

  // Dedicated advance edit state
  const [advanceEditSale, setAdvanceEditSale] = useState<CustomerSale | null>(null);
  const [advanceEditAmount, setAdvanceEditAmount] = useState(0);
  const [advanceEditMethod, setAdvanceEditMethod] = useState<'Cash' | 'Credit'>('Cash');

  const selectedCustomer = store.customers.find(c => c.id === selectedCustomerId);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editMode && editingId) {
      if (editMode === 'customer') {
        store.updateCustomer(editingId, { name: newEntry.name, phone: newEntry.phone, nickname: newEntry.nickname });
        
        // Update associated payments
        const c = store.customers.find(cust => cust.id === editingId);
        entryPayments.forEach(p => {
          if (p.amount > 0) {
            const existing = c?.payments.find(ep => ep.id === p.id);
            if (existing) {
              store.updateCustomerPayment(editingId, p.id, { amount: p.amount, date: p.date, method: p.method as any });
            } else {
              store.addPaymentToCustomer(editingId, { amount: p.amount, date: p.date, method: p.method as any });
            }
          }
        });
      } else if (editMode === 'sale' && editingId && selectedCustomerId) {
        const p = purchases[0];
        store.updateCustomerSale(selectedCustomerId, editingId, {
          date: p.date,
          crates: Number(p.crates),
          rate: Number(p.crates) > 0 ? Number(p.totalValue) / Number(p.crates) : 0,
          billNo: p.billNo,
          commPercent: Number(newEntry.commPercent),
          wariRate: Number(newEntry.wariRate),
          advance: Number(p.advance),
          advanceMethod: p.advanceMethod,
          discount: Number(p.discount),
          paymentMode: p.paymentMode,
        });
      store.updateCustomer(selectedCustomerId, { name: newEntry.name, phone: newEntry.phone, nickname: newEntry.nickname });

        // Also handle payments added during sale edit
        const c = store.customers.find(cust => cust.id === selectedCustomerId);
        entryPayments.forEach(p => {
          if (p.amount > 0) {
            const existing = c?.payments.find(ep => ep.id === p.id);
            if (existing) {
              store.updateCustomerPayment(selectedCustomerId, p.id, { amount: p.amount, date: p.date, method: p.method as any });
            } else {
              store.addPaymentToCustomer(selectedCustomerId, { amount: p.amount, date: p.date, method: p.method as any });
            }
          }
        });
      } else if (editMode === 'payment') {
        const ownerCustomer = editingId
          ? store.customers.find(c => c.payments.some(p => p.id === editingId))
          : selectedCustomer;
        const ownerId = ownerCustomer?.id ?? selectedCustomerId;
        if (ownerId && entryPayments[0].amount > 0) {
          if (editingId) {
            // Editing existing payment
            store.updateCustomerPayment(ownerId, editingId, {
              amount: Number(entryPayments[0].amount),
              date: entryPayments[0].date,
              method: entryPayments[0].method as any,
            });
          } else {
            // Adding new payment
            store.addPaymentToCustomer(ownerId, {
              amount: Number(entryPayments[0].amount),
              date: entryPayments[0].date,
              method: entryPayments[0].method as any,
            });
          }
        }
      }
    } else {
      // New entry — save ALL purchases together
      const customerData = { name: newEntry.name, phone: newEntry.phone, nickname: newEntry.nickname };

      // Check if customer already exists
      const existing = store.customers.find(c =>
        c.name.trim().toLowerCase() === newEntry.name.trim().toLowerCase() &&
        c.nickname.trim().toLowerCase() === newEntry.nickname.trim().toLowerCase()
      );

      const allSales = purchases.map(p => ({
        date: p.date,
        crates: Number(p.crates),
        rate: Number(p.crates) > 0 ? Number(p.totalValue) / Number(p.crates) : 0,
        billNo: p.billNo,
        commPercent: Number(newEntry.commPercent),
        wariRate: Number(newEntry.wariRate),
        advance: Number(p.advance),
        advanceMethod: p.advanceMethod,
        discount: Number(p.discount),
        paymentMode: p.paymentMode,
      }));

      if (existing) {
        // Add all purchases to existing customer
        for (const sale of allSales) {
          await store.addSaleToCustomer(existing.id, sale);
        }
      } else {
        // Create new customer with first sale, then add rest
        const customerId = await store.addCustomerWithFirstSale(customerData, allSales[0], []);
        if (customerId && allSales.length > 1) {
          for (const sale of allSales.slice(1)) {
            await store.addSaleToCustomer(customerId, sale);
          }
        }
      }
    }
    resetForm();
  };

  const resetForm = () => {
    setNewEntry({
      name: '', phone: '', nickname: '',
      commPercent: CUSTOMER_COMMISSION_PERCENT, wariRate: CASH_WARI_CUSTOMER,
    });
    setPurchases([{
      id: Math.random().toString(),
      date: new Date().toISOString().split('T')[0],
      crates: 0, totalValue: 0, billNo: store.getNextBillNo(),
      advance: 0, advanceMethod: 'Cash', discount: 0, paymentMode: 'Credit',
    }]);
    setEntryPayments([{ id: Math.random().toString(), amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash' }]);
    setIsAddingEntry(false);
    setEditMode(null);
    setEditingId(null);
  };

  const openNewEntry = () => {
    resetForm();
    setIsAddingEntry(true);
  };

  const openAddPurchase = (c: Customer) => {
    resetForm();
    setNewEntry({
      name: c.name, phone: c.phone || '', nickname: c.nickname || '',
      commPercent: CUSTOMER_COMMISSION_PERCENT, wariRate: CASH_WARI_CUSTOMER,
    });
    setIsAddingEntry(true);
  };

  const openEditCustomer = (c: Customer) => {
    setNewEntry({
      name: c.name, phone: c.phone || '', nickname: c.nickname || '',
      commPercent: c.sales[0]?.commPercent ?? CUSTOMER_COMMISSION_PERCENT,
      wariRate: c.sales[0]?.wariRate ?? CASH_WARI_CUSTOMER,
    });
    setPurchases(c.sales.length > 0 ? [{
      id: c.sales[0].id,
      date: c.sales[0].date,
      crates: c.sales[0].crates,
      totalValue: c.sales[0].crates * c.sales[0].rate,
      billNo: c.sales[0].billNo || '',
      advance: c.sales[0].advance ?? 0,
      advanceMethod: (c.sales[0].advanceMethod as 'Cash' | 'Credit') ?? 'Cash',
      discount: c.sales[0].discount ?? 0,
      paymentMode: (c.sales[0].paymentMode as 'Cash' | 'Credit') ?? 'Credit',
    }] : [{
      id: Math.random().toString(),
      date: new Date().toISOString().split('T')[0],
      crates: 0, totalValue: 0, billNo: '',
      advance: 0, advanceMethod: 'Cash' as const, discount: 0, paymentMode: 'Credit' as const,
    }]);

    if (c.payments.length > 0) {
      setEntryPayments(c.payments.map(p => ({ id: p.id, amount: p.amount, date: p.date, method: p.method })));
    } else {
      setEntryPayments([{ id: Math.random().toString(), amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash' }]);
    }

    setEditMode('customer');
    setEditingId(c.id);
    setIsAddingEntry(true);
  };

  const openEditSale = (s: CustomerSale) => {
    const parent = store.customers.find(c => c.sales.some(x => x.id === s.id));
    setNewEntry({
      name: parent?.name || '', phone: parent?.phone || '', nickname: parent?.nickname || '',
      commPercent: s.commPercent ?? CUSTOMER_COMMISSION_PERCENT,
      wariRate: s.wariRate ?? CASH_WARI_CUSTOMER,
    });
    setPurchases([{
      id: s.id,
      date: s.date, crates: s.crates, totalValue: s.crates * s.rate,
      billNo: s.billNo,
      advance: s.advance ?? 0,
      advanceMethod: (s.advanceMethod as 'Cash' | 'Credit') ?? 'Cash',
      discount: s.discount ?? 0,
      paymentMode: (s.paymentMode as 'Cash' | 'Credit') ?? 'Credit',
    }]);

    if (parent && parent.payments.length > 0) {
      setEntryPayments(parent.payments.map(p => ({ id: p.id, amount: p.amount, date: p.date, method: p.method })));
    } else {
      setEntryPayments([{ id: Math.random().toString(), amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash' }]);
    }

    setEditMode('sale');
    setEditingId(s.id);
    setIsAddingEntry(true);
  };

  const openNewPayment = () => {
    resetForm();
    if (selectedCustomer) {
      setNewEntry(prev => ({ ...prev, name: selectedCustomer.name, phone: selectedCustomer.phone, nickname: selectedCustomer.nickname }));
    }
    setEditMode('payment');
    setIsAddingEntry(true);
  };

  const openEditPayment = (p: any) => {
    const parent = store.customers.find(c => c.payments.some(x => x.id === p.id));
    setNewEntry({
      name: parent?.name || '',
      phone: parent?.phone || '',
      nickname: parent?.nickname || '',
      date: '', crates: 0, totalValue: 0, billNo: '',
      commPercent: CUSTOMER_COMMISSION_PERCENT, wariRate: CASH_WARI_CUSTOMER,
      advance: 0, advanceMethod: 'Cash' as 'Cash' | 'Credit', discount: 0, paymentMode: 'Credit' as 'Cash' | 'Credit'    });
    setEntryPayments([{ id: p.id, amount: p.amount, date: p.date, method: p.method }]);
    // Make sure selectedCustomerId is set so the save handler can find the customer
    if (parent && !selectedCustomerId) setSelectedCustomerId(parent.id);
    setEditMode('payment');
    setEditingId(p.id);
    setIsAddingEntry(true);
  };

  const openAddReturn = () => {
    setReturnForm({ date: new Date().toISOString().split('T')[0], crates: 0, originalCost: 0, newCost: 0, remarks: '' });
    setReturnModal({ open: true, editing: null });
  };

  const openEditReturn = (r: CustomerReturn) => {
    setReturnForm({ date: r.date, crates: r.crates, originalCost: 0, newCost: r.newCost, remarks: r.remarks });
    setReturnModal({ open: true, editing: r });
  };

  const handleSaveReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    // reduction = originalCost - newCost (what gets deducted from balance)
    const reduction = returnForm.originalCost > 0
      ? returnForm.originalCost - returnForm.newCost
      : returnForm.newCost;
    const payload = { date: returnForm.date, crates: returnForm.crates, newCost: reduction, remarks: returnForm.remarks };
    if (returnModal.editing) {
      store.updateCustomerReturn(selectedCustomerId, returnModal.editing.id, payload);
    } else {
      store.addReturnToCustomer(selectedCustomerId, payload);
    }
    setReturnModal({ open: false, editing: null });
  };

  const openEditAdvance = (sale: CustomerSale) => {    setAdvanceEditSale(sale);
    setAdvanceEditAmount(sale.advance ?? 0);
    setAdvanceEditMethod((sale.advanceMethod as 'Cash' | 'Credit') ?? 'Cash');
  };

  const handleSaveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceEditSale || !selectedCustomerId) return;
    store.updateCustomerSale(selectedCustomerId, advanceEditSale.id, {
      advance: Number(advanceEditAmount),
      advanceMethod: advanceEditMethod,
    });
    setAdvanceEditSale(null);
  };

  const viewDetail = (id: string) => {
    setSelectedCustomerId(id);
    setView('detail');
  };
  const backToList = () => {
    setSelectedCustomerId(null);
    setView('list');
  };

  const handleExport = () => {
    const headers = ['Customer Name', 'Type', 'Date', 'Ref/Bill No', 'Crates', 'Rate', 'Gross Total', 'Tax/Comm', 'Cash Wari', 'Bill Amount (Debit)', 'Advance Payment', 'Paid Amount (Credit)', 'Final Payment'];
    const data = filteredCustomers.flatMap(cust => {
      const sales = cust.sales.map(s => {
        const billAmt = calcSaleNet(s);
        const adv = s.advance ?? 0;
        return [
          cust.name,
          'Sale',
          s.date,
          s.billNo,
          s.crates,
          s.rate,
          calcSaleTotal(s),
          calcSaleCommission(s),
          calcSaleCashWari(s),
          billAmt,
          adv,
          0,
          billAmt - adv
        ];
      });
      const payments = cust.payments.map(p => [
        cust.name,
        'Payment',
        p.date,
        p.method,
        '',
        '',
        '',
        '',
        '',
        0,
        0,
        p.amount,
        -p.amount
      ]);
      return [...sales, ...payments];
    }).sort((a, b) => new Date(a[2] as string).getTime() - new Date(b[2] as string).getTime());

    downloadCSV(data, headers, `customer_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handlePrint = (period: PrintPeriod) => {
    setShowPrintModal(false);
    const periodLabel = getPeriodLabel(period);
    const printData = filteredCustomers.map(cust => ({
      ...cust,
      sales: cust.sales.filter(s => isWithinPrintPeriod(s.date, period)),
      payments: cust.payments.filter(p => isWithinPrintPeriod(p.date, period)),
    })).filter(c => c.sales.length > 0 || c.payments.length > 0 || period === 'all');

    const rs = (n: number) => `Rs. ${n.toLocaleString()}`;

    const rows: string[][] = printData.flatMap(cust =>
      cust.sales.map(s => {
        const gross = s.crates * s.rate;
        const comm = Math.round(gross * (s.commPercent ?? 7.25) / 100);
        const wari = s.crates * (s.wariRate ?? 5);
        const net = gross + comm + wari;
        const adv = s.advance ?? 0;
        return [
          cust.name, cust.nickname || '', cust.phone || '',
          s.date, s.billNo, String(s.crates),
          rs(s.rate), rs(gross), rs(comm), rs(wari),
          rs(net), adv > 0 ? rs(adv) : '--',
          rs(net - adv), s.paymentMode,
        ];
      })
    );

    const totalGross = printData.reduce((s, c) => s + c.sales.reduce((ss, sl) => ss + sl.crates * sl.rate, 0), 0);
    const totalComm = printData.reduce((s, c) => s + c.sales.reduce((ss, sl) => ss + Math.round(sl.crates * sl.rate * (sl.commPercent ?? 7.25) / 100), 0), 0);
    const totalWari = printData.reduce((s, c) => s + c.sales.reduce((ss, sl) => ss + sl.crates * (sl.wariRate ?? 5), 0), 0);
    const totalNet = totalGross + totalComm + totalWari;
    const totalAdv = printData.reduce((s, c) => s + c.sales.reduce((ss, sl) => ss + (sl.advance ?? 0), 0), 0);
    const totalCratesAll = printData.reduce((s, c) => s + c.sales.reduce((ss, sl) => ss + sl.crates, 0), 0);

    openPrintWindow({
      title: 'Customer Ledger (خریدار لیجر)',
      subtitle: `${printData.length} customer(s) · ${totalCratesAll.toLocaleString()} crates`,
      periodLabel,
      columns: [
        { label: 'Customer', urdu: 'خریدار' },
        { label: 'Nickname', urdu: 'عرفیت' },
        { label: 'Phone', urdu: 'فون' },
        { label: 'Date', urdu: 'تاریخ' },
        { label: 'Bill No', urdu: 'بل نمبر' },
        { label: 'Crates', urdu: 'کریٹس', align: 'right' },
        { label: 'Rate', urdu: 'ریٹ', align: 'right' },
        { label: 'Gross', urdu: 'کل رقم', align: 'right' },
        { label: 'Comm', urdu: 'کمیشن', align: 'right' },
        { label: 'Wari', urdu: 'واری', align: 'right' },
        { label: 'Net Bill', urdu: 'بل', align: 'right' },
        { label: 'Advance', urdu: 'بیانہ', align: 'right' },
        { label: 'Remaining', urdu: 'بقایہ', align: 'right' },
        { label: 'Mode', urdu: 'طریقہ' },
      ],
      rows,
      summaryRows: [
        { label: 'Total Crates (کل کریٹس)', value: totalCratesAll.toLocaleString() },
        { label: 'Gross Total (کل رقم)', value: `Rs. ${totalGross.toLocaleString()}` },
        { label: 'Commission (کمیشن)', value: `Rs. ${totalComm.toLocaleString()}`, color: '#16a34a' },
        { label: 'Wari (واری)', value: `Rs. ${totalWari.toLocaleString()}`, color: '#16a34a' },
        { label: 'Total Net Bill (کل بل)', value: `Rs. ${totalNet.toLocaleString()}`, bold: true },
        { label: 'Total Advance (بیانہ)', value: `Rs. ${totalAdv.toLocaleString()}`, color: '#2563eb' },
        { label: 'Total Remaining (بقایہ)', value: `Rs. ${(totalNet - totalAdv).toLocaleString()}`, bold: true, color: '#dc2626' },
      ],
      emptyMessage: 'No customer records for this period',
    });
  };

  const handlePrintSingle = (cust: Customer) => {
    const rs = (n: number) => `Rs. ${n.toLocaleString()}`;
    const rows: string[][] = cust.sales.map(s => {
      const gross = s.crates * s.rate;
      const comm = Math.round(gross * (s.commPercent ?? 7.25) / 100);
      const wari = s.crates * (s.wariRate ?? 5);
      const net = gross + comm + wari;
      const adv = s.advance ?? 0;
      return [
        s.date, s.billNo, String(s.crates),
        rs(s.rate), rs(gross), rs(comm), rs(wari),
        rs(net), adv > 0 ? rs(adv) : '--',
        rs(net - adv), s.paymentMode,
      ];
    });

    const totalGross = cust.sales.reduce((s, sl) => s + sl.crates * sl.rate, 0);
    const totalComm = cust.sales.reduce((s, sl) => s + calcSaleCommission(sl), 0);
    const totalWari = cust.sales.reduce((s, sl) => s + calcSaleCashWari(sl), 0);
    const totalNet = totalGross + totalComm + totalWari;
    const totalAdv = cust.sales.reduce((s, sl) => s + (sl.advance ?? 0), 0);
    const totalCratesAll = cust.sales.reduce((s, sl) => s + sl.crates, 0);
    const totalBalance = calcCustomerBalance(cust);

    openPrintWindow({
      title: `Customer Ledger — ${cust.name}`,
      subtitle: `${cust.nickname || ''} · ${cust.phone || ''} · ${totalCratesAll.toLocaleString()} crates`,
      periodLabel: 'All Time',
      columns: [
        { label: 'Date', urdu: 'تاریخ' },
        { label: 'Bill No', urdu: 'بل نمبر' },
        { label: 'Crates', urdu: 'کریٹس', align: 'right' },
        { label: 'Rate', urdu: 'ریٹ', align: 'right' },
        { label: 'Gross', urdu: 'کل رقم', align: 'right' },
        { label: 'Comm', urdu: 'کمیشن', align: 'right' },
        { label: 'Wari', urdu: 'واری', align: 'right' },
        { label: 'Net Bill', urdu: 'بل', align: 'right' },
        { label: 'Advance', urdu: 'بیانہ', align: 'right' },
        { label: 'Remaining', urdu: 'بقایہ', align: 'right' },
        { label: 'Mode', urdu: 'طریقہ' },
      ],
      rows,
      summaryRows: [
        { label: 'Total Crates (کل کریٹس)', value: totalCratesAll.toLocaleString() },
        { label: 'Gross Total (کل رقم)', value: rs(totalGross) },
        { label: 'Commission (کمیشن)', value: rs(totalComm), color: '#16a34a' },
        { label: 'Wari (واری)', value: rs(totalWari), color: '#16a34a' },
        { label: 'Total Net Bill (کل بل)', value: rs(totalNet), bold: true },
        { label: 'Total Advance (بیانہ)', value: rs(totalAdv), color: '#2563eb' },
        { label: 'Pending Balance (بقایہ)', value: rs(totalBalance), bold: true, color: totalBalance > 0 ? '#dc2626' : '#16a34a' },
      ],
      emptyMessage: 'No records for this customer',
    });
  };

  const grossTotal = purchases.reduce((s, p) => s + Number(p.totalValue), 0);
  const commAmount = Math.round(grossTotal * Number(newEntry.commPercent) / 100);
  const wariAmount = purchases.reduce((s, p) => s + Number(p.crates), 0) * Number(newEntry.wariRate);
  const netBill = grossTotal + commAmount + wariAmount;
  const discountAmount = purchases.reduce((s, p) => s + Number(p.discount || 0), 0);
  const advancePayment = purchases.reduce((s, p) => s + Number(p.advance || 0), 0);
  const remainingBill = netBill - discountAmount - advancePayment;

  const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

  if (view === 'detail' && selectedCustomer) {
    const totalBalance = calcCustomerBalance(selectedCustomer);
    const summaryTotalCrates = selectedCustomer.sales.reduce((s, x) => s + x.crates, 0);

    return (
      <div>
        <div className="detail-header">
          <button className="back-btn" onClick={backToList}><ArrowLeft size={18} /></button>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{selectedCustomer.name} {selectedCustomer.nickname && <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>({selectedCustomer.nickname})</span>}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}><Phone size={12} style={{ display: 'inline', marginRight: 4 }} /> {selectedCustomer.phone}</p>
          </div>
        </div>

        <div className="content-grid cols-3" style={{ marginBottom: 24 }}>
          <div className="glass-card" style={{ padding: 24, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem' }}>Sales Records (خریداری ڈیٹا)</h3>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date (تاریخ)</th>
                    <th>Mode (طریقہ)</th>
                    <th>Crates (کریٹس)</th>
                    <th>Rate (ریٹ فی کریٹ)</th>
                    <th>Gross Total (کل رقم)</th>
                    <th>Commission (کمیشن)</th>
                    <th>Cash Wari (نقد واری)</th>
                    <th>Net Bill (بل)</th>
                    <th>Discount (رعایت)</th>
                    <th>Advance (بیانہ)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomer.sales.map(sale => (
                    <tr key={sale.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>{sale.date}</td>
                      <td>
                        {sale.paymentMode === 'Cash'
                          ? <span className="badge orange">نقد (Cash)</span>
                          : <span className="badge blue">ادھار (Credit)</span>}
                      </td>
                      <td style={{ fontWeight: 500 }}>{sale.crates}</td>
                      <td>{fmt(sale.rate)}</td>
                      <td>{fmt(calcSaleTotal(sale))}</td>
                      <td style={{ color: 'var(--red)' }}>+{fmt(calcSaleCommission(sale))}</td>
                      <td style={{ color: 'var(--red)' }}>+{fmt(calcSaleCashWari(sale))}</td>
                      <td style={{ fontWeight: 600, color: 'var(--blue)' }}>{fmt(calcSaleNet(sale))}</td>
                      <td style={{ color: (sale.discount ?? 0) > 0 ? 'var(--orange)' : 'var(--text-secondary)' }}>
                        {(sale.discount ?? 0) > 0 ? `-${fmt(sale.discount!)}` : '--'}
                      </td>
                      <td style={{ color: (sale.advance ?? 0) > 0 ? 'var(--green)' : 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{(sale.advance ?? 0) > 0 ? `-${fmt(sale.advance!)}` : '--'}</span>
                          {(sale.advance ?? 0) > 0 && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                              [{sale.advanceMethod ?? 'Cash'}]
                            </span>
                          )}
                          <button className="topbar-icon-btn" title="Edit Advance" onClick={() => openEditAdvance(sale)}>
                            <Edit2 size={11} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="topbar-icon-btn" onClick={() => openEditSale(sale)}><Edit2 size={14} /></button>
                          <button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => { if (confirm('Delete this sale?')) store.deleteCustomerSale(selectedCustomerId!, sale.id) }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {selectedCustomer.sales.length === 0 && (
                    <tr><td colSpan={11} className="empty-state">No sales added yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="summary-panel" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Customer Summary</h3>
              <div className="summary-row">
                <span className="label">Total Crates (کل کریٹس)</span>
                <span className="value">{summaryTotalCrates.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span className="label">Total Bill (کل بل)</span>
                <span className="value">{fmt(calcCustomerTotalBill(selectedCustomer))}</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                (Includes discounts &amp; returns deducted)
              </p>
              {calcCustomerTotalDiscount(selectedCustomer) > 0 && (
                <div className="summary-row">
                  <span className="label" style={{ color: 'var(--orange)' }}>Discount (رعایت)</span>
                  <span className="value" style={{ color: 'var(--orange)' }}>-{fmt(calcCustomerTotalDiscount(selectedCustomer))}</span>
                </div>
              )}
              <div className="summary-row">
                <span className="label">Advance Paid (بیانہ)</span>
                <span className="value" style={{ color: 'var(--green)' }}>-{fmt(calcCustomerTotalAdvance(selectedCustomer))}</span>
              </div>
              {calcCustomerTotalReturns(selectedCustomer) > 0 && (
                <div className="summary-row">
                  <span className="label" style={{ color: 'var(--blue)' }}>Returns (واپسی)</span>
                  <span className="value" style={{ color: 'var(--blue)' }}>-{fmt(calcCustomerTotalReturns(selectedCustomer))}</span>
                </div>
              )}
              <div className="summary-row">
                <span className="label">Payments Received (ادائیگیاں)</span>
                <span className="value" style={{ color: 'var(--green)' }}>-{fmt(calcCustomerTotalPayments(selectedCustomer))}</span>
              </div>
              <div className="summary-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                <span className="label" style={{ fontWeight: 700 }}>Pending Balance (بقایہ)</span>
                <span className="value" style={{ fontSize: '1.1rem', color: totalBalance > 0 ? 'var(--orange)' : 'var(--green)', fontWeight: 700 }}>
                  {fmt(totalBalance)}
                </span>
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {totalBalance > 0 ? '⚠ Receivable from Customer' : '✓ Customer is Clear'}
                </p>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={openNewPayment}>
                  <DollarSign size={16} /> نئی ادائیگی (New Payment)
                </button>
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={openAddReturn}>
                  <span style={{ fontSize: 14 }}>↩</span> واپسی (New Return)
                </button>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Payment History (ادائیگی)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedCustomer.payments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ display: 'block', fontWeight: 500 }}>آج کی ادائیگی (Payment)</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 600, color: p.method === 'Credit' ? 'var(--blue)' : 'var(--green)' }}>[{p.method}]</span>
                        <span style={{ marginLeft: 8 }}>{p.date}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--green)' }}>{fmt(p.amount)}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="topbar-icon-btn" onClick={() => openEditPayment(p)}><Edit2 size={12} /></button>
                        <button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => { if (confirm('Delete this payment?')) store.deleteCustomerPayment(selectedCustomerId!, p.id) }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedCustomer.payments.length === 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>No payments yet</p>
                )}
              </div>
            </div>

            {/* Returns History */}
            {(selectedCustomer.returns || []).length > 0 && (
              <div className="glass-card" style={{ padding: 24, marginTop: 16 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>واپسی کی تاریخ (Returns)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(selectedCustomer.returns || []).map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--blue)' }}>↩ {r.crates} crates returned</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {r.date} {r.remarks && <span>· {r.remarks}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 600, color: 'var(--blue)', display: 'block' }}>-{fmt(r.newCost)}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>balance reduction</span>
                        </div>
                        <button className="topbar-icon-btn" onClick={() => openEditReturn(r)}><Edit2 size={12}/></button>
                        <button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => { if(confirm('Delete this return?')) store.deleteCustomerReturn(selectedCustomerId!, r.id); }}><Trash2 size={12}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Return Modal ── */}
        {returnModal.open && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 440 }}>
              <div className="modal-header">
                <h3>↩ {returnModal.editing ? 'Edit Return' : 'New Return (واپسی)'}</h3>
                <button className="topbar-icon-btn" onClick={() => setReturnModal({ open: false, editing: null })}><X size={18}/></button>
              </div>
              <form onSubmit={handleSaveReturn}>
                <div className="modal-body">
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Customer returned goods. Enter the original sale value and the new agreed cost — the difference will be deducted from their balance.
                  </p>
                  <div className="form-grid cols-2">
                    <div className="form-group">
                      <label>Date (تاریخ)</label>
                      <input type="date" className="form-control" required value={returnForm.date} onChange={e => setReturnForm({ ...returnForm, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Crates Returned (کریٹس)</label>
                      <input type="number" className="form-control" required min="1" value={returnForm.crates || ''} onChange={e => setReturnForm({ ...returnForm, crates: Number(e.target.value) })} />
                    </div>
                    <div className="form-group">
                      <label>Original Sale Value (اصل قیمت)</label>
                      <input type="number" className="form-control" required min="0" value={returnForm.originalCost || ''} onChange={e => setReturnForm({ ...returnForm, originalCost: Number(e.target.value) })} placeholder="What customer originally paid" />
                    </div>
                    <div className="form-group">
                      <label>New Agreed Cost (نئی قیمت)</label>
                      <input type="number" className="form-control" required min="0" value={returnForm.newCost || ''} onChange={e => setReturnForm({ ...returnForm, newCost: Number(e.target.value) })} placeholder="New lower value you agreed on" />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>Remarks (نوٹس)</label>
                      <input className="form-control" value={returnForm.remarks} onChange={e => setReturnForm({ ...returnForm, remarks: e.target.value })} placeholder="e.g. Damaged goods, quality issue..." />
                    </div>
                  </div>
                  {returnForm.originalCost > 0 && returnForm.newCost > 0 && (
                    <div style={{ background: 'var(--background)', borderRadius: 10, padding: 14, marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Original Value</span>
                        <span>{fmt(returnForm.originalCost)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>New Agreed Cost</span>
                        <span>{fmt(returnForm.newCost)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                        <span>Balance Reduction (کٹوتی)</span>
                        <span style={{ color: 'var(--blue)' }}>-{fmt(returnForm.originalCost - returnForm.newCost)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: 6 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Balance After Return</span>
                        <span style={{ fontWeight: 700, color: (totalBalance - (returnForm.originalCost - returnForm.newCost)) > 0 ? 'var(--orange)' : 'var(--green)' }}>
                          {fmt(totalBalance - (returnForm.originalCost - returnForm.newCost))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setReturnModal({ open: false, editing: null })}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Return</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Advance Edit Modal ── */}
        {advanceEditSale && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <h3>بیانہ ترمیم (Edit Advance Payment)</h3>
                <button className="topbar-icon-btn" onClick={() => setAdvanceEditSale(null)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveAdvance}>
                <div className="modal-body">
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Bill: <strong>{advanceEditSale.billNo}</strong> &nbsp;|&nbsp; Date: <strong>{advanceEditSale.date}</strong>
                  </p>
                  <div className="form-group">
                    <label>Advance Amount (بیانہ رقم)</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={advanceEditAmount || ''}
                      onChange={e => setAdvanceEditAmount(Number(e.target.value))}
                      placeholder="0"
                      autoFocus
                    />
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                      Set to 0 to remove advance. Balance will update automatically.
                    </p>
                  </div>
                  <div className="form-group">
                    <label>Payment Method (طریقہ)</label>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                      {(['Cash', 'Credit'] as const).map(m => (
                        <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: advanceEditMethod === m ? 600 : 400 }}>
                          <input
                            type="radio"
                            name="advanceMethod"
                            value={m}
                            checked={advanceEditMethod === m}
                            onChange={() => setAdvanceEditMethod(m)}
                          />
                          {m === 'Cash' ? 'نقد (Cash)' : 'ادھار (Credit)'}
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Live balance preview */}
                  <div style={{ background: 'var(--background)', borderRadius: 10, padding: 14, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Net Bill</span>
                      <span>{fmt(calcSaleNet(advanceEditSale))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Advance (new)</span>
                      <span style={{ color: 'var(--green)' }}>-{fmt(advanceEditAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      <span>Remaining</span>
                      <span style={{ color: (calcSaleNet(advanceEditSale) - advanceEditAmount) > 0 ? 'var(--orange)' : 'var(--green)' }}>
                        {fmt(calcSaleNet(advanceEditSale) - advanceEditAmount)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setAdvanceEditSale(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Advance</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const filteredCustomers = store.customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || (c.nickname && c.nickname.toLowerCase().includes(q))) return true;
    return false;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Customer Management</h2>
          <p>Manage Mandi buyers, tracking sale commissions and ledgers.</p>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <Search className="search-icon" size={15} />
            <input
              placeholder="Search name, phone, nickname..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} /> Export Data
          </button>
          <button className="btn btn-secondary" onClick={() => setShowPrintModal(true)}>
            <Printer size={16} /> Print
          </button>
          <button className="btn btn-primary" onClick={openNewEntry}>
            <Plus size={16} /> New Entry (نیا اندراج)
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0 0 12px 0' }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer (خریدار)</th>
                <th>Payment Mode (طریقہ کار)</th>
                <th>Purchase Value (کل خریداری)</th>
                <th>Pending Payment (بقایہ)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(cust => {
                const balance = calcCustomerBalance(cust);
                // Total purchase value = sum of all sales net bills (after discount) minus returns
                const totalPurchaseValue = calcCustomerTotalBill(cust);
                return (
                  <tr key={cust.id}>
                    <td>
                      <span style={{ fontWeight: 600, display: 'block' }}>{cust.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({cust.nickname})</span>
                    </td>
                    <td>
                      {(() => {
                        // Use paymentMode from the most recent sale
                        const sortedSales = [...(cust.sales || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        const m = sortedSales.length > 0 ? sortedSales[0].paymentMode : '--';
                        if (m === 'Cash') return <span className="badge orange">نقد (Cash)</span>;
                        if (m === 'Credit') return <span className="badge blue">ادھار (Credit)</span>;
                        return <span className="badge">--</span>;
                      })()}
                    </td>
                    <td><span style={{ fontWeight: 600 }}>{fmt(totalPurchaseValue)}</span></td>
                    <td>
                      <span style={{ color: balance > 0 ? 'var(--orange)' : 'var(--green)', fontWeight: 600 }}>
                        {fmt(balance)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => viewDetail(cust.id)}>
                          View Details
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} title="Add Purchase" onClick={() => openAddPurchase(cust)}>
                          <Plus size={13} />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: 6 }} title="Print" onClick={() => handlePrintSingle(cust)}><Printer size={14}/></button>
                        <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => openEditCustomer(cust)}><Edit2 size={14} /></button>
                        <button className="btn btn-secondary" style={{ padding: 6, color: 'var(--red)' }} onClick={() => { if (confirm('Delete customer?')) store.deleteCustomer(cust.id) }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPrintModal && (
        <PrintModal
          title="Customer Report پرنٹ کریں"
          onClose={() => setShowPrintModal(false)}
          onPrint={handlePrint}
        />
      )}

      {isAddingEntry && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>{editMode === 'customer' ? 'Edit Customer' : editMode === 'sale' ? 'Edit Sale' : editMode === 'payment' ? 'Edit Payment' : newEntry.name ? `Add Purchase — ${newEntry.name}` : 'New Entry'}</h3>
              <button className="topbar-icon-btn" onClick={resetForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddEntry}>
              <div className="modal-body">
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 16 }}>خریدار پروفائل (Customer Profile)</h4>
                <div className="form-grid cols-3">
                  <div className="form-group">
                    <label>Name (نام)</label>
                    <input className="form-control" required value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} readOnly={editMode === 'payment' && !!selectedCustomerId} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number (فون نمبر)</label>
                    <input className="form-control" value={newEntry.phone} onChange={e => setNewEntry({ ...newEntry, phone: e.target.value })} readOnly={editMode === 'payment' && !!selectedCustomerId} />
                  </div>
                  <div className="form-group">
                    <label>Nickname (عرفیت/شہر)</label>
                    <input className="form-control" value={newEntry.nickname} onChange={e => setNewEntry({ ...newEntry, nickname: e.target.value })} readOnly={editMode === 'payment' && !!selectedCustomerId} />
                  </div>
                </div>

                {editMode !== 'payment' && (
                  <>
                    {/* Commission & Wari — shared across all purchases */}
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '24px 0 12px' }}>ریٹ سیٹنگ (Rate Settings)</h4>
                    <div className="form-grid cols-2" style={{ marginBottom: 20 }}>
                      <div className="form-group">
                        <label>Commission % (کمیشن فیصد)</label>
                        <input type="number" step="0.01" className="form-control" required value={newEntry.commPercent} onChange={e => setNewEntry({ ...newEntry, commPercent: Number(e.target.value) })} />
                      </div>
                      <div className="form-group">
                        <label>Wari Rate (واری ریٹ)</label>
                        <input type="number" step="0.1" className="form-control" value={newEntry.wariRate} onChange={e => setNewEntry({ ...newEntry, wariRate: Number(e.target.value) })} />
                      </div>
                    </div>

                    {/* Multiple Purchases */}
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>خریداری ڈیٹا (Purchase Data)</h4>
                    {purchases.map((p, idx) => (
                      <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 14, background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--blue)' }}>Purchase {idx + 1}</span>
                          {purchases.length > 1 && (
                            <button type="button" className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => setPurchases(purchases.filter(x => x.id !== p.id))}>
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <div className="form-grid cols-3">
                          <div className="form-group">
                            <label>Date (تاریخ)</label>
                            <input type="date" className="form-control" required value={p.date} onChange={e => setPurchases(purchases.map(x => x.id === p.id ? { ...x, date: e.target.value } : x))} />
                          </div>
                          <div className="form-group">
                            <label>Crates (کریٹس)</label>
                            <input type="number" className="form-control" required value={p.crates || ''} onChange={e => setPurchases(purchases.map(x => x.id === p.id ? { ...x, crates: Number(e.target.value) } : x))} />
                          </div>
                          <div className="form-group">
                            <label>Total Value (کل رقم)</label>
                            <input type="number" className="form-control" required value={p.totalValue || ''} onChange={e => setPurchases(purchases.map(x => x.id === p.id ? { ...x, totalValue: Number(e.target.value) } : x))} placeholder="Total value of all crates" />
                            {p.crates > 0 && p.totalValue > 0 && (
                              <p style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
                                Rs. {(p.totalValue / p.crates).toFixed(2)} / crate
                              </p>
                            )}
                          </div>
                          <div className="form-group">
                            <label>Bill No (بل نمبر)</label>
                            <input className="form-control" value={p.billNo} onChange={e => setPurchases(purchases.map(x => x.id === p.id ? { ...x, billNo: e.target.value } : x))} />
                          </div>
                          <div className="form-group">
                            <label>Advance (بیانہ)</label>
                            <input type="number" className="form-control" value={p.advance || ''} onChange={e => setPurchases(purchases.map(x => x.id === p.id ? { ...x, advance: Number(e.target.value) } : x))} placeholder="0" />
                          </div>
                          <div className="form-group">
                            <label>Discount (رعایت)</label>
                            <input type="number" className="form-control" value={p.discount || ''} onChange={e => setPurchases(purchases.map(x => x.id === p.id ? { ...x, discount: Number(e.target.value) } : x))} placeholder="0" />
                          </div>
                        </div>
                        {/* Payment Mode per purchase */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                          {(['Cash', 'Credit'] as const).map(m => (
                            <label key={m} onClick={() => setPurchases(purchases.map(x => x.id === p.id ? { ...x, paymentMode: m } : x))} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem',
                              border: `2px solid ${p.paymentMode === m ? (m === 'Cash' ? 'var(--orange)' : 'var(--blue)') : 'var(--border)'}`,
                              background: p.paymentMode === m ? (m === 'Cash' ? 'rgba(255,149,0,0.08)' : 'rgba(0,122,255,0.08)') : 'transparent',
                              fontWeight: p.paymentMode === m ? 700 : 400,
                              color: p.paymentMode === m ? (m === 'Cash' ? 'var(--orange)' : 'var(--blue)') : 'var(--text-secondary)',
                            }}>
                              {m === 'Cash' ? '💵 نقد (Cash)' : '📋 ادھار (Credit)'}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button type="button" className="btn btn-secondary" style={{ marginBottom: 20, fontSize: '0.78rem' }}
                      onClick={() => setPurchases([...purchases, {
                        id: Math.random().toString(),
                        date: new Date().toISOString().split('T')[0],
                        crates: 0, totalValue: 0, billNo: '',
                        advance: 0, advanceMethod: 'Cash' as const, discount: 0, paymentMode: 'Credit' as const,
                      }])}>
                      <Plus size={14} style={{ marginRight: 4 }} /> مزید خریداری (Add Another Purchase)
                    </button>

                    {/* Premium Live Bill Dashboard */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1a1a1a, #2c2c2e)',
                      padding: 24,
                      borderRadius: 16,
                      marginTop: 24,
                      color: 'white',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#8e8e93' }}>بل کی تفصیلات (LIVE BILL SUMMARY)</h4>
                        <span className="badge blue" style={{ background: 'rgba(0,122,255,0.2)', color: '#007aff', border: 'none' }}>Customer Invoice</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                        <div>
                          <p style={{ fontSize: '0.7rem', color: '#8e8e93', marginBottom: 4, textTransform: 'uppercase' }}>Gross Total (کل مال)</p>
                          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{fmt(grossTotal)}</h3>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.7rem', color: '#34c759', marginBottom: 4, textTransform: 'uppercase' }}>Additions (+ فویس)</p>
                          <div style={{ fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Tax/Comm ({newEntry.commPercent}%):</span>
                              <span style={{ fontWeight: 600 }}>{fmt(commAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                              <span>Wari:</span>
                              <span style={{ fontWeight: 600 }}>{fmt(wariAmount)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.7rem', color: '#ff9500', marginBottom: 4, textTransform: 'uppercase' }}>Deductions (کٹوتی)</p>
                          <div style={{ fontSize: '0.82rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Advance:</span>
                              <span style={{ color: '#ff3b30', fontWeight: 600 }}>{fmt(advancePayment)}</span>
                            </div>
                            {discountAmount > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                                <span>Discount:</span>
                                <span style={{ color: '#ff9500', fontWeight: 600 }}>{fmt(discountAmount)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                          <p style={{ fontSize: '0.7rem', color: '#007aff', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>REMAINING (بقایہ بل)</p>
                          <h2 style={{ margin: 0, fontSize: '1.4rem', color: remainingBill > 0 ? '#fff' : '#34c759' }}>
                            {fmt(remainingBill)}
                          </h2>
                          <p style={{ fontSize: '0.6rem', color: '#8e8e93', marginTop: 4 }}>{remainingBill <= 0 ? 'Fully Cleared' : 'Pending from customer'}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {(editMode === null || editMode === 'customer' || editMode === 'sale' || editMode === 'payment') && (
                  <>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '24px 0 16px' }}>رقم کی وصولی (Record Payments)</h4>
                    {entryPayments.map((p, idx) => (
                      <div key={p.id} style={{ border: '1px solid var(--border)', padding: 12, borderRadius: 8, marginBottom: 12, background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Payment {idx + 1}</span>
                          {entryPayments.length > 1 && (
                            <button type="button" className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => setEntryPayments(entryPayments.filter(x => x.id !== p.id))}><X size={14} /></button>
                          )}
                        </div>
                        <div className="form-grid cols-2">
                          <div className="form-group">
                            <label>Amount (رقم)</label>
                            <input type="number" className="form-control" value={p.amount || ''} onChange={e => setEntryPayments(entryPayments.map(x => x.id === p.id ? { ...x, amount: Number(e.target.value) } : x))} />
                          </div>
                          <div className="form-group">
                            <label>Date (تاریخ)</label>
                            <input type="date" className="form-control" value={p.date} onChange={e => setEntryPayments(entryPayments.map(x => x.id === p.id ? { ...x, date: e.target.value } : x))} />
                          </div>
                          <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Method</label>
                            <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                              {['Cash', 'Bank', 'Credit'].map(m => (
                                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                                  <input type="radio" name={`payMode-${p.id}`} checked={p.method === m} onChange={() => setEntryPayments(entryPayments.map(x => x.id === p.id ? { ...x, method: m as any } : x))} />
                                  {m}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginBottom: 16, fontSize: '0.75rem' }}
                      onClick={() => setEntryPayments([...entryPayments, { id: Math.random().toString(), amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash' }])}
                    >
                      <Plus size={14} style={{ marginRight: 4 }} /> {remainingBill <= 0 ? 'Bill Fully Paid' : 'Add Multiple Payment (مزید ادائیگی)'}
                    </button>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerModule;
