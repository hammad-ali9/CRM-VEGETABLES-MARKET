import React, { useState } from 'react';
import { useStore, calcSupplierBalance, calcTruckTotal, calcSupplierGrossTotal, calcSupplierTotalReceived, type Supplier, type TruckRecord } from '../store';
import { Plus, ArrowLeft, Truck, MapPin, Search, X, Edit2, Trash2, Download, Printer, DollarSign } from 'lucide-react';
import { downloadCSV } from '../utils/exportUtils';
import PrintModal from '../components/PrintModal';
import { isWithinPrintPeriod, getPeriodLabel, type PrintPeriod } from '../utils/printUtils';
import { openPrintWindow } from '../utils/printTemplate';

const SupplierModule: React.FC = () => {
  const store = useStore();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Unified Entry State
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [editMode, setEditMode] = useState<'supplier' | 'truck' | 'payment' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newEntry, setNewEntry] = useState({
    name: '', city: '', phone: '', truckNo: '', loadingDate: new Date().toISOString().split('T')[0], builtyNo: '',
    truckFare: 0, labourRate: 10, carriageRate: 10,
    saleDate: '', advance: 0, advanceDate: '', bardana: 0, bardanaDate: '',
    paymentMode: 'Credit' as 'Cash' | 'Credit', remarks: ''
  });
  const [parties, setParties] = useState<{ id: string, personName: string, crates: number, rate: number, totalValue?: number }[]>([]);

  // Initialize one empty owner by default for new entries
  React.useEffect(() => {
    if (parties.length === 0 && !isAddingEntry && !editMode) {
      setParties([{ id: Math.random().toString(), personName: '', crates: 0, rate: 0, totalValue: 0 }]);
    }
  }, [isAddingEntry, editMode, parties.length]);
  const [entryPayments, setEntryPayments] = useState([{ id: Math.random().toString(), amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash' as 'Cash' | 'Online' | 'Credit' | 'Bank', accountNo: '', accountHolderName: '' }]);

  const selectedSupplier = store.suppliers.find(s => s.id === selectedSupplierId);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    try {
      const totalCratesCalc = parties.reduce((s, p) => s + Number(p.crates), 0);
      const labourTotal = totalCratesCalc * Number(newEntry.labourRate);
      const carriageTotal = totalCratesCalc * Number(newEntry.carriageRate);

      const truckPayload = {
        truckNo: newEntry.truckNo,
        loadingDate: newEntry.loadingDate,
        builtyNo: newEntry.builtyNo,
        truckFare: Number(newEntry.truckFare),
        labourCharges: labourTotal,
        carriage: carriageTotal,
        parties: parties.map(p => ({
          id: p.id || Math.random().toString(),
          personName: p.personName,
          crates: Number(p.crates),
          rate: Number(p.rate)
        })),
        saleDate: newEntry.saleDate,
        advance: Number(newEntry.advance),
        advanceDate: newEntry.advanceDate,
        bardana: Number(newEntry.bardana),
        bardanaDate: newEntry.bardanaDate,
        paymentMode: newEntry.paymentMode,
        remarks: newEntry.remarks,
      };

      if (editMode && editingId) {
        if (editMode === 'supplier') {
          // Update Supplier Profile
          await store.updateSupplier(editingId, { name: newEntry.name, city: newEntry.city, phone: newEntry.phone });

          // Update associated Truck (if any was loaded)
          const s = store.suppliers.find(sup => sup.id === editingId);
          if (s && s.trucks.length > 0) {
            await store.updateTruck(editingId, s.trucks[0].id, truckPayload);
          }

          // Update Payments
          for (const p of entryPayments) {
            if (p.amount > 0) {
              // Check if it's an existing payment or a new one
              const existing = s?.payments.find(ep => ep.id === p.id);
              if (existing) {
                await store.updateSupplierPayment(editingId, p.id, { amount: p.amount, date: p.date, method: p.method as any, accountNo: p.accountNo, accountHolderName: p.accountHolderName });
              } else {
                await store.addPaymentToSupplier(editingId, { amount: p.amount, date: p.date, method: p.method as any, accountNo: p.accountNo, accountHolderName: p.accountHolderName });
              }
            }
          }
        } else if (editMode === 'truck' && editingId && selectedSupplierId) {
          await store.updateTruck(selectedSupplierId, editingId, truckPayload);
        } else if (editMode === 'payment') {
          const ownerSupplier = editingId
            ? store.suppliers.find(s => s.payments.some(p => p.id === editingId))
            : selectedSupplier;
          const ownerId = ownerSupplier?.id ?? selectedSupplierId;
          if (ownerId && entryPayments[0].amount > 0) {
            if (editingId) {
              await store.updateSupplierPayment(ownerId, editingId, {
                amount: Number(entryPayments[0].amount),
                date: entryPayments[0].date,
                method: entryPayments[0].method as any,
                accountNo: entryPayments[0].accountNo,
                accountHolderName: entryPayments[0].accountHolderName,
              });
            } else {
              await store.addPaymentToSupplier(ownerId, {
                amount: Number(entryPayments[0].amount),
                date: entryPayments[0].date,
                method: entryPayments[0].method as any,
                accountNo: entryPayments[0].accountNo,
                accountHolderName: entryPayments[0].accountHolderName,
              });
            }
          }
        }
      } else {
        // NEW ENTRY flow
        await store.addSupplierWithFirstTruck(
          { name: newEntry.name, city: newEntry.city, phone: newEntry.phone, status: 'active' },
          truckPayload,
          entryPayments.map(p => ({ amount: p.amount, date: p.date, method: p.method as any, accountNo: p.accountNo, accountHolderName: p.accountHolderName }))
        );
      }

      resetForm();
    } catch (err) {
      console.error('Failed to save entry:', err);
      alert('Failed to save entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewEntry({
      name: '', city: '', phone: '', truckNo: '', loadingDate: new Date().toISOString().split('T')[0], builtyNo: '',
      truckFare: 0, labourRate: 10, carriageRate: 10,
      saleDate: '', advance: 0, advanceDate: '', bardana: 0, bardanaDate: '',
      paymentMode: 'Credit', remarks: ''
    });
    setParties([{ id: Math.random().toString(), personName: '', crates: 0, rate: 0, totalValue: 0 }]);
    setEntryPayments([{ id: Math.random().toString(), amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash', accountNo: '', accountHolderName: '' }]);
    setIsAddingEntry(false);
    setEditMode(null);
    setEditingId(null);
  };

  const openNewEntry = () => {
    resetForm();
    setIsAddingEntry(true);
  };

  const openEditSupplier = (s: Supplier) => {
    resetForm();
    setNewEntry(prev => ({ ...prev, name: s.name, city: s.city, phone: s.phone || '' }));

    if (s.trucks.length > 0) {
      const t = s.trucks[0];
      const totalCratesT = t.parties.reduce((sum, p) => sum + p.crates, 0);
      setNewEntry(prev => ({
        ...prev,
        truckNo: t.truckNo || '',
        loadingDate: t.loadingDate || '',
        builtyNo: t.builtyNo || '',
        truckFare: t.truckFare ?? 0,
        labourRate: totalCratesT > 0 ? Math.round((t.labourCharges ?? 0) / totalCratesT) : 10,
        carriageRate: totalCratesT > 0 ? Math.round((t.carriage ?? 0) / totalCratesT) : 10,
        saleDate: t.saleDate || '',
        advance: t.advance ?? 0,
        advanceDate: t.advanceDate || '',
        bardana: t.bardana ?? 0,
        bardanaDate: t.bardanaDate || '',
        paymentMode: t.paymentMode ?? 'Credit',
        remarks: t.remarks || ''
      }));
      setParties(t.parties && t.parties.length > 0 ? t.parties.map(p => ({ ...p, totalValue: p.crates * p.rate })) : [{ id: Math.random().toString(), personName: '', crates: 0, rate: 0, totalValue: 0 }]);
    } else {
      setNewEntry(prev => ({ ...prev, truckNo: '', loadingDate: '' }));
      setParties([{ id: Math.random().toString(), personName: '', crates: 0, rate: 0, totalValue: 0 }]);
    }

    if (s.payments.length > 0) {
      setEntryPayments(s.payments.map(p => ({ id: p.id, amount: p.amount, date: p.date, method: p.method as any, accountNo: p.accountNo || '', accountHolderName: p.accountHolderName || '' })));
    } else {
      setEntryPayments([{ id: Math.random().toString(), amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash', accountNo: '', accountHolderName: '' }]);
    }

    setEditMode('supplier');
    setEditingId(s.id);
    setSelectedSupplierId(s.id);
    setIsAddingEntry(true);
  };

  const openEditTruck = (t: TruckRecord) => {
    resetForm();
    const parent = store.suppliers.find(s => s.trucks.some(tr => tr.id === t.id));
    if (parent) {
      setNewEntry(prev => ({ ...prev, name: parent.name, city: parent.city, phone: parent.phone || '' }));
      setSelectedSupplierId(parent.id);
    } else if (t.supplierId) {
      setSelectedSupplierId(t.supplierId);
      const s = store.suppliers.find(sup => sup.id === t.supplierId);
      if (s) setNewEntry(prev => ({ ...prev, name: s.name, city: s.city, phone: s.phone || '' }));
    }

    const totalCratesT = (t.parties || []).reduce((sum, p) => sum + (Number(p.crates) || 0), 0);
    setNewEntry(prev => ({
      ...prev,
      truckNo: t.truckNo || '',
      loadingDate: t.loadingDate || '',
      builtyNo: t.builtyNo || '',
      truckFare: t.truckFare ?? 0,
      labourRate: totalCratesT > 0 ? Math.round((t.labourCharges ?? 0) / totalCratesT) : 10,
      carriageRate: totalCratesT > 0 ? Math.round((t.carriage ?? 0) / totalCratesT) : 10,
      saleDate: t.saleDate || '',
      advance: t.advance ?? 0,
      advanceDate: t.advanceDate || '',
      bardana: t.bardana ?? 0,
      bardanaDate: t.bardanaDate || '',
      paymentMode: t.paymentMode ?? 'Credit',
      remarks: t.remarks || ''
    }));
    setParties(t.parties && t.parties.length > 0 ? t.parties.map(p => ({ ...p, totalValue: Number(p.crates) * Number(p.rate) })) : [{ id: Math.random().toString(), personName: '', crates: 0, rate: 0, totalValue: 0 }]);
    setEditMode('truck');
    setEditingId(t.id);
    setIsAddingEntry(true);
  };

  const openEditPayment = (p: any) => {
    resetForm();
    const parent = store.suppliers.find(s => s.payments.some(x => x.id === p.id));
    if (parent) {
      setNewEntry(prev => ({ ...prev, name: parent.name, city: parent.city }));
      setSelectedSupplierId(parent.id);
    }
    setEntryPayments([{ id: p.id, amount: p.amount, date: p.date, method: p.method, accountNo: p.accountNo || '', accountHolderName: p.accountHolderName || '' }]);
    setEditMode('payment');
    setEditingId(p.id);
    setIsAddingEntry(true);
  };

  const viewDetail = (id: string) => {
    setSelectedSupplierId(id);
    setView('detail');
  };

  const backToList = () => {
    setSelectedSupplierId(null);
    setView('list');
  };

  const handleExport = () => {
    const headers = ['Supplier Name', 'Type', 'Date', 'Ref/Truck No', 'Goods Owner/Method', 'Crates', 'Rate', 'Gross Amount', 'Advance', 'Carriage', 'Net Goods (Credit)', 'Paid Amount (Debit)'];
    const data = filteredSuppliers.flatMap(sup => {
      const allRows: any[] = [];

      sup.trucks.forEach(truck => {
        const totalCrates = truck.parties.reduce((sum, p) => sum + p.crates, 0);

        truck.parties.forEach((party, idx) => {
          const gross = party.crates * party.rate;
          const share = totalCrates > 0 ? party.crates / totalCrates : 0;
          const allocatedCarriage = Math.round(truck.carriage * share);
          const net = gross - allocatedCarriage;

          allRows.push([
            sup.name,
            'Goods',
            truck.loadingDate,
            truck.truckNo,
            party.personName,
            party.crates,
            party.rate,
            gross,
            idx === 0 ? truck.advance : 0,
            allocatedCarriage,
            net,
            0
          ]);
        });
      });

      // 4. General Payments
      sup.payments.forEach(p => {
        allRows.push([
          sup.name,
          'Payment',
          p.date,
          p.method,
          'General Payment',
          '', '', '', '', '',
          0,
          p.amount
        ]);
      });

      return allRows;
    }).sort((a, b) => new Date(a[2] as string).getTime() - new Date(b[2] as string).getTime());

    downloadCSV(data, headers, `supplier_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handlePrint = (period: PrintPeriod) => {
    setShowPrintModal(false);
    const periodLabel = getPeriodLabel(period);
    const printData = filteredSuppliers.map(sup => ({
      ...sup,
      trucks: sup.trucks.filter(t => isWithinPrintPeriod(t.loadingDate, period)),
      payments: sup.payments.filter(p => isWithinPrintPeriod(p.date, period)),
    })).filter(sup => sup.trucks.length > 0 || sup.payments.length > 0 || period === 'all');

    const rs = (n: number) => `Rs. ${n.toLocaleString()}`;

    const rows: string[][] = printData.flatMap(sup =>
      sup.trucks.flatMap(t => {
        const totalCratesT = t.parties.reduce((s, p) => s + p.crates, 0);
        return t.parties.map((p, idx) => {
          const gross = p.crates * p.rate;
          const share = totalCratesT > 0 ? p.crates / totalCratesT : 0;
          const carriage = Math.round(t.carriage * share);
          const net = gross - carriage;
          return [
            sup.name, sup.city, t.loadingDate || '', t.truckNo,
            p.personName, String(p.crates), rs(p.rate), rs(gross),
            idx === 0 ? rs(t.advance) : '--',
            rs(carriage), rs(net), t.paymentMode,
          ];
        });
      })
    );

    // Summary totals
    const totalGross = printData.reduce((s, sup) => s + sup.trucks.reduce((ss, t) => ss + t.parties.reduce((ps, p) => ps + p.crates * p.rate, 0), 0), 0);
    const totalCratesAll = printData.reduce((s, sup) => s + sup.trucks.reduce((ss, t) => ss + t.parties.reduce((ps, p) => ps + p.crates, 0), 0), 0);

    openPrintWindow({
      title: 'Supplier Ledger (بیوپاری لیجر)',
      subtitle: `${printData.length} supplier(s) · ${totalCratesAll.toLocaleString()} crates`,
      periodLabel,
      columns: [
        { label: 'Supplier', urdu: 'بیوپاری' },
        { label: 'City', urdu: 'شہر' },
        { label: 'Date', urdu: 'تاریخ' },
        { label: 'Truck No', urdu: 'ٹرک نمبر' },
        { label: 'Party', urdu: 'مالک' },
        { label: 'Crates', urdu: 'کریٹس', align: 'right' },
        { label: 'Rate', urdu: 'ریٹ', align: 'right' },
        { label: 'Gross', urdu: 'کل رقم', align: 'right' },
        { label: 'Advance', urdu: 'بیانہ', align: 'right' },
        { label: 'Carriage', urdu: 'کیریج', align: 'right' },
        { label: 'Net', urdu: 'خالص', align: 'right' },
        { label: 'Mode', urdu: 'طریقہ' },
      ],
      rows,
      summaryRows: [
        { label: 'Total Crates (کل کریٹس)', value: totalCratesAll.toLocaleString() },
        { label: 'Gross Total (کل رقم)', value: `Rs. ${totalGross.toLocaleString()}`, bold: true },
      ],
      emptyMessage: 'No supplier records for this period',
    });
  };

  const handlePrintSingle = (sup: Supplier) => {
    const rs = (n: number) => `Rs. ${n.toLocaleString()}`;
    const rows: string[][] = sup.trucks.flatMap(t => {
      const totalCratesT = t.parties.reduce((s, p) => s + p.crates, 0);
      return t.parties.map((p, idx) => {
        const gross = p.crates * p.rate;
        const share = totalCratesT > 0 ? p.crates / totalCratesT : 0;
        const carriage = Math.round(t.carriage * share);
        const net = gross - carriage;
        return [
          t.loadingDate || '', t.truckNo, p.personName, String(p.crates),
          rs(p.rate), rs(gross),
          idx === 0 ? rs(t.advance) : '--', rs(carriage), rs(net), t.paymentMode,
        ];
      });
    });

    const totalGross = sup.trucks.reduce((s, t) => s + t.parties.reduce((ss, p) => ss + p.crates * p.rate, 0), 0);
    const totalCratesAll = sup.trucks.reduce((s, t) => s + t.parties.reduce((ss, p) => ss + p.crates, 0), 0);
    const totalBalance = calcSupplierBalance(sup);

    openPrintWindow({
      title: `Supplier Ledger — ${sup.name}`,
      subtitle: `${sup.city} · ${totalCratesAll.toLocaleString()} crates`,
      periodLabel: 'All Time',
      columns: [
        { label: 'Date', urdu: 'تاریخ' },
        { label: 'Truck No', urdu: 'ٹرک نمبر' },
        { label: 'Party', urdu: 'مالک' },
        { label: 'Crates', urdu: 'کریٹس', align: 'right' },
        { label: 'Rate', urdu: 'ریٹ', align: 'right' },
        { label: 'Gross', urdu: 'کل رقم', align: 'right' },
        { label: 'Advance', urdu: 'بیانہ', align: 'right' },
        { label: 'Carriage', urdu: 'کیریج', align: 'right' },
        { label: 'Net', urdu: 'خالص', align: 'right' },
        { label: 'Mode', urdu: 'طریقہ' },
      ],
      rows,
      summaryRows: [
        { label: 'Total Crates (کل کریٹس)', value: totalCratesAll.toLocaleString() },
        { label: 'Gross Total (کل رقم)', value: rs(totalGross) },
        { label: 'Remaining Balance (بقایہ)', value: rs(totalBalance), bold: true, color: totalBalance > 0 ? '#dc2626' : '#16a34a' },
      ],
      emptyMessage: 'No records for this supplier',
    });
  };

  const totalCrates = parties.reduce((s, p) => s + Number(p.crates), 0);
  const grossTotal = parties.reduce((s, p) => s + Number(p.totalValue), 0);
  const labourTotal = totalCrates * Number(newEntry.labourRate);
  const carriageTotal = totalCrates * Number(newEntry.carriageRate);
  const totalPaidInEntry = entryPayments.reduce((s, p) => s + Number(p.amount), 0);
  const grandTotal = grossTotal;
  const balance = grandTotal - labourTotal - carriageTotal - Number(newEntry.truckFare) - Number(newEntry.advance) - Number(newEntry.bardana) - totalPaidInEntry;

  console.log('[SupplierModule Form Balance]', {
    grossTotal,
    labourTotal,
    carriageTotal,
    truckFare: Number(newEntry.truckFare),
    advance: Number(newEntry.advance),
    bardana: Number(newEntry.bardana),
    totalPaidInEntry,
    balance
  });

  const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

  const filteredSuppliers = store.suppliers.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();

    if (s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.supplierCode.toLowerCase().includes(q)) return true;

    if ((s.trucks || []).some(t =>
      t.truckNo.toLowerCase().includes(q) ||
      t.builtyNo.toLowerCase().includes(q) ||
      t.loadingDate.includes(q) ||
      t.saleDate.includes(q)
    )) return true;

    if ((s.payments || []).some(p => p.date.includes(q))) return true;

    return false;
  });

  return (
    <div>
      {view === 'detail' && selectedSupplier ? (
        <div>
          <div className="detail-header">
            <button className="back-btn" onClick={backToList}><ArrowLeft size={18} /></button>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{selectedSupplier.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> {selectedSupplier.city}</p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: 4 }}>Code: {selectedSupplier.supplierCode}</p>
            </div>
          </div>

          <div className="content-grid cols-3" style={{ marginBottom: 24 }}>
            <div className="glass-card" style={{ padding: 24, gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: '1rem' }}>Truck Records</h3>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>Truck / Builty</th>
                      <th style={{ width: '110px' }}>Loading Date</th>
                      <th>Parties / Owners</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Crates</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Gross Total</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Net Payable</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSupplier.trucks.map(truck => {
                      const truckTotalCrates = truck.parties.reduce((sum, p) => sum + p.crates, 0);
                      const truckGrossValue = calcTruckTotal(truck);
                      const truckNetPayable = truckGrossValue - (truck.labourCharges || 0) - (truck.carriage || 0) - (truck.truckFare || 0) - (truck.advance || 0);
                      const ownersList = truck.parties.map(p => p.personName).join(', ');

                      return (
                        <tr key={truck.id} style={{ transition: 'all 0.2s' }}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--blue)' }}>{truck.truckNo}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>B: {truck.builtyNo || 'N/A'}</div>
                          </td>
                          <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {truck.loadingDate}
                          </td>
                          <td style={{ fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ownersList}>
                            {ownersList || 'No owners'}
                            {truck.remarks && <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{truck.remarks}</div>}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{truckTotalCrates}</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(truckGrossValue)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>
                            {fmt(truckNetPayable)}
                            {truck.advance > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--green)' }}>Adv: {fmt(truck.advance)}</div>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => openEditTruck(truck)} title="Edit Truck"><Edit2 size={12} /></button>
                              <button className="btn btn-secondary" style={{ padding: 6, color: 'var(--red)' }} onClick={() => { if (confirm('Delete this truck?')) store.deleteTruck(selectedSupplier.id, truck.id) }} title="Delete Truck"><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {selectedSupplier.trucks.length === 0 && (
                      <tr><td colSpan={7} className="empty-state">No trucks added yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="summary-panel" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Supplier Summary</h3>
                <div className="summary-row">
                  <span className="label">Total Crates (کل کریٹس)</span>
                  <span className="value">{(selectedSupplier.trucks.reduce((s, t) => s + t.parties.reduce((ps, p) => ps + p.crates, 0), 0)).toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span className="label">Gross Total (کل رقم)</span>
                  <span className="value">{fmt(calcSupplierGrossTotal(selectedSupplier))}</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4, marginBottom: 12 }}>
                  Deductions from Gross Total:
                </p>
                <div className="summary-row">
                  <span className="label" style={{ color: 'var(--red)', fontSize: '0.85rem' }}>Carriage (کیریج)</span>
                  <span className="value" style={{ color: 'var(--red)', fontSize: '0.85rem' }}>-{fmt(selectedSupplier.trucks.reduce((s, t) => s + t.carriage, 0))}</span>
                </div>
                <div className="summary-row">
                  <span className="label" style={{ color: 'var(--red)', fontSize: '0.85rem' }}>Truck Fare (ٹرک کرایہ)</span>
                  <span className="value" style={{ color: 'var(--red)', fontSize: '0.85rem' }}>-{fmt(selectedSupplier.trucks.reduce((s, t) => s + (t.truckFare ?? 0), 0))}</span>
                </div>
                <div className="summary-row">
                  <span className="label" style={{ color: 'var(--red)', fontSize: '0.85rem' }}>Labour (مزدوری)</span>
                  <span className="value" style={{ color: 'var(--red)', fontSize: '0.85rem' }}>-{fmt(selectedSupplier.trucks.reduce((s, t) => s + (t.labourCharges ?? 0), 0))}</span>
                </div>
                <div className="summary-row">
                  <span className="label" style={{ color: 'var(--green)', fontSize: '0.85rem' }}>Advance (بیانہ)</span>
                  <span className="value" style={{ color: 'var(--green)', fontSize: '0.85rem' }}>-{fmt(selectedSupplier.trucks.reduce((s, t) => s + t.advance, 0))}</span>
                </div>
                <div className="summary-row">
                  <span className="label" style={{ color: 'var(--green)', fontSize: '0.85rem' }}>Bardana (باردانہ)</span>
                  <span className="value" style={{ color: 'var(--green)', fontSize: '0.85rem' }}>-{fmt(selectedSupplier.trucks.reduce((s, t) => s + (t.bardana ?? 0), 0))}</span>
                </div>
                <div className="summary-row">
                  <span className="label" style={{ color: 'var(--green)', fontSize: '0.85rem' }}>Payments (ادائیگیاں)</span>
                  <span className="value" style={{ color: 'var(--green)', fontSize: '0.85rem' }}>-{fmt(selectedSupplier.payments.reduce((s, p) => s + p.amount, 0))}</span>
                </div>
                <div className="summary-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
                  <span className="label" style={{ fontWeight: 700 }}>Balance (بقایہ)</span>
                  <span className="value" style={{ fontSize: '1.1rem', color: calcSupplierBalance(selectedSupplier) > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                    {fmt(calcSupplierBalance(selectedSupplier))}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 12 }}>
                  {calcSupplierBalance(selectedSupplier) > 0 ? '⚠ Payable to Supplier' : '✓ Fully Settled'}
                </p>
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={() => {
                  resetForm();
                  if (selectedSupplier) setNewEntry(prev => ({ ...prev, name: selectedSupplier.name, city: selectedSupplier.city }));
                  setEditMode('payment');
                  setIsAddingEntry(true);
                }}>
                  <DollarSign size={16} /> نئی ادائیگی (New Payment)
                </button>
              </div>

              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Payment History (ادائیگیاں)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedSupplier.payments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ display: 'block', fontWeight: 500 }}>نئی ادائیگی (Payment)</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600, color: p.method === 'Credit' ? 'var(--blue)' : 'var(--green)' }}>[{p.method}]</span>
                          <span style={{ marginLeft: 8 }}>{p.date}</span>
                          {p.addedBy && <span style={{ marginLeft: 8, fontStyle: 'italic', color: 'var(--text-tertiary)' }}>• Added by: {p.addedBy} at {p.addedAtStr}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--green)' }}>{fmt(p.amount)}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="topbar-icon-btn" onClick={() => openEditPayment(p)}><Edit2 size={12} /></button>
                          <button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => { if (confirm('Delete this payment?')) store.deleteSupplierPayment(selectedSupplierId!, p.id) }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedSupplier.payments.length === 0 && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>No payments yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <h2>Supplier Management</h2>
              <p>Manage tomato purchases, truck details, and balances.</p>
            </div>
            <div className="page-actions">
              <div className="search-bar">
                <Search className="search-icon" size={15} />
                <input
                  placeholder="Search name, truck, date..."
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
                    <th>Supplier (سپلائر)</th>
                    <th>Payment Mode (طریقہ کار)</th>
                    <th>Total Cost (کل لاگت)</th>
                    <th>Received (وصولی)</th>
                    <th>Remaining Balance (بقایہ)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(sup => {
                    const totalCost = calcSupplierGrossTotal(sup);
                    const received = calcSupplierTotalReceived(sup);
                    const balance = calcSupplierBalance(sup);

                    return (
                      <tr key={sup.id}>
                        <td>
                          <span style={{ fontWeight: 600, display: 'block' }}>{sup.name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sup.city}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block', marginTop: 2 }}>Code: {sup.supplierCode}</span>
                        </td>
                        <td>
                          {(() => {
                            const sortedTrucks = [...(sup.trucks || [])].sort((a, b) => new Date(b.loadingDate).getTime() - new Date(a.loadingDate).getTime());
                            const m = sortedTrucks.length > 0 ? sortedTrucks[0].paymentMode : '--';
                            if (m === 'Cash') return <span className="badge orange">نقد (Cash)</span>;
                            if (m === 'Credit') return <span className="badge blue">ادھار (Credit)</span>;
                            return <span className="badge">--</span>;
                          })()}
                        </td>
                        <td>{fmt(totalCost)}</td>
                        <td style={{ color: 'var(--green)' }}>{fmt(received)}</td>
                        <td>
                          <span style={{ color: balance > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                            {fmt(balance)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => viewDetail(sup.id)}>
                              View Details
                            </button>
                            <button className="btn btn-secondary" style={{ padding: 6 }} title="Add Entry" onClick={() => {
                              resetForm();
                              setNewEntry(prev => ({ ...prev, name: sup.name, city: sup.city, phone: sup.phone || '' }));
                              setParties([{ id: Math.random().toString(), personName: '', crates: 0, rate: 0, totalValue: 0 }]);
                              setSelectedSupplierId(sup.id);
                              setEditMode(null);
                              setIsAddingEntry(true);
                            }}><Plus size={14} /></button>
                            <button className="btn btn-secondary" style={{ padding: 6 }} title="Print" onClick={() => handlePrintSingle(sup)}><Printer size={14} /></button>
                            <button className="btn btn-secondary" style={{ padding: 6 }} onClick={() => openEditSupplier(sup)}><Edit2 size={14} /></button>
                            <button className="btn btn-secondary" style={{ padding: 6, color: 'var(--red)' }} onClick={() => { if (confirm('Delete this supplier and all their records?')) store.deleteSupplier(sup.id) }}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSuppliers.length === 0 && (
                    <tr><td colSpan={5} className="empty-state">
                      <Truck size={32} style={{ display: 'block', margin: '0 auto 12px' }} />
                      {searchQuery ? 'کوئی ریکارڈ نہیں ملا (No matches found)' : 'No suppliers found. Create your first supplier.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showPrintModal && (
        <PrintModal
          title="Supplier Report پرنٹ کریں"
          onClose={() => setShowPrintModal(false)}
          onPrint={handlePrint}
        />
      )}

      {isAddingEntry && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <h3>{editMode === 'supplier' ? 'Edit Supplier' : editMode === 'truck' ? 'Edit Truck Record' : editMode === 'payment' ? 'Edit Payment' : 'New Entry (نیا اندراج)'}</h3>
              <button className="topbar-icon-btn" onClick={resetForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddEntry}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

                <div className="glass-card" style={{ marginBottom: 20, padding: 16, background: 'linear-gradient(135deg, #2c3e50, #000000)', color: 'white', border: 'none' }}>
                  <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.6, marginBottom: 12 }}>Live Truck Calculation (بل کی تفصیل)</h4>
                  <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div>
                      <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>Gross Total (کل رقم)</p>
                      <p style={{ fontWeight: 700 }}>{fmt(grossTotal)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.65rem', opacity: 0.7, color: 'var(--red)' }}>Deductions (Labour + Carriage + Truck Fare)</p>
                      <p style={{ fontWeight: 700, color: '#ff3b30' }}>-{fmt(labourTotal + carriageTotal + Number(newEntry.truckFare))}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.65rem', opacity: 0.7 }}>Balance</p>
                      <p style={{ fontWeight: 700, color: balance > 0 ? '#fbbf24' : '#4ade80' }}>{fmt(balance)}</p>
                    </div>
                  </div>
                </div>

                {(editMode === null || editMode === 'supplier' || editMode === 'truck') && (
                  <>
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>1-2. بیوپاری نام / Trader Name & شہر / City</h4>
                      <div className="form-grid cols-2">
                        <div className="form-group">
                          <label>1. بیوپاری نام / Trader Name *</label>
                          <input className="form-control" required value={newEntry.name} onChange={e => setNewEntry({ ...newEntry, name: e.target.value })} placeholder="e.g. Haji Saleem" />
                        </div>
                        <div className="form-group">
                          <label>2. شہر / City *</label>
                          <input className="form-control" required value={newEntry.city} onChange={e => setNewEntry({ ...newEntry, city: e.target.value })} placeholder="e.g. Quetta" />
                        </div>
                      </div>
                    </div>

                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16 }}>3-9. ٹرک ڈیٹا (Truck Data)</h4>
                    <div className="form-grid cols-3">
                      <div className="form-group">
                        <label>3. فون نمبر / Phone Number</label>
                        <input className="form-control" value={newEntry.phone} onChange={e => setNewEntry({ ...newEntry, phone: e.target.value })} placeholder="03XX-XXXXXXX" />
                      </div>
                      <div className="form-group">
                        <label>4. بلٹی نمبر / Bilty Number</label>
                        <input className="form-control" value={newEntry.builtyNo} onChange={e => setNewEntry({ ...newEntry, builtyNo: e.target.value })} placeholder="BLT-123" />
                      </div>
                      <div className="form-group">
                        <label>5. گاڑی نمبر / Vehicle Number *</label>
                        <input className="form-control" required value={newEntry.truckNo} onChange={e => setNewEntry({ ...newEntry, truckNo: e.target.value })} placeholder="LES-1234" />
                      </div>
                      <div className="form-group">
                        <label>6. لوڈنگ تاریخ / Loading Date *</label>
                        <input type="date" className="form-control" required value={newEntry.loadingDate} onChange={e => setNewEntry({ ...newEntry, loadingDate: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>7. ٹرک کرایہ / Truck Fare</label>
                        <input type="number" className="form-control" value={newEntry.truckFare || ''} onChange={e => setNewEntry({ ...newEntry, truckFare: Number(e.target.value) })} placeholder="0" />
                      </div>
                      <div className="form-group">
                        <label>8. مزدوری (فی کریٹ 10 روپے) / Labour Charges (Rs. 10 per Crate)</label>
                        <input type="number" className="form-control" value={newEntry.labourRate} onChange={e => setNewEntry({ ...newEntry, labourRate: Number(e.target.value) })} />
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Total: {fmt(labourTotal)}</p>
                      </div>
                      <div className="form-group">
                        <label>9. لاگا / کیرج (فی کریٹ 10 روپے) / Laga / Carriage (Rs. 10 per Crate)</label>
                        <input type="number" className="form-control" value={newEntry.carriageRate} onChange={e => setNewEntry({ ...newEntry, carriageRate: Number(e.target.value) })} />
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Total: {fmt(carriageTotal)}</p>
                      </div>

                    </div>

                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16 }}>10-13. مالکان / پارٹیز (Goods Owners)</h4>
                    {parties.map((party, index) => (
                      <div key={party.id} style={{ border: '1px dashed var(--border)', padding: 12, marginBottom: 12, borderRadius: 8, position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Owner {index + 1}</span>
                          {parties.length > 1 && (
                            <button type="button" className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => setParties(parties.filter(p => p.id !== party.id))}><X size={14} /></button>
                          )}
                        </div>
                        <div className="form-grid cols-4">
                          <div className="form-group">
                            <label>10. بیوپاری نام / Owner Name *</label>
                            <input className="form-control" required value={party.personName} onChange={e => setParties(parties.map(p => p.id === party.id ? { ...p, personName: e.target.value } : p))} placeholder="e.g. Ali" />
                          </div>
                          <div className="form-group">
                            <label>11. ٹوٹل کریٹ / Crates *</label>
                            <input type="number" className="form-control" required value={party.crates || ''} onChange={e => {
                              const v = Number(e.target.value);
                              setParties(parties.map(p => p.id === party.id ? { ...p, crates: v, totalValue: v * p.rate } : p));
                            }} />
                          </div>
                          <div className="form-group">
                            <label>12. ریٹ / Rate *</label>
                            <input type="number" className="form-control" required value={party.rate || ''} onChange={e => {
                              const v = Number(e.target.value);
                              setParties(parties.map(p => p.id === party.id ? { ...p, rate: v, totalValue: p.crates * v } : p));
                            }} placeholder="Rate" />
                          </div>
                          <div className="form-group">
                            <label>13. کل رقم / Total Amount *</label>
                            <input type="number" className="form-control" required value={party.totalValue || ''} onChange={e => {
                              const v = Number(e.target.value);
                              setParties(parties.map(p => p.id === party.id ? { ...p, totalValue: v, rate: p.crates > 0 ? v / p.crates : p.rate } : p));
                            }} placeholder="Total" />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button type="button" className="btn btn-secondary" style={{ marginBottom: 16, fontSize: '0.75rem' }} onClick={() => setParties([...parties, { id: Math.random().toString(), personName: '', crates: 0, rate: 0, totalValue: 0 }])}>
                      <Plus size={14} style={{ marginRight: 4 }} /> مزید شخص (Add Another Person)
                    </button>

                    <div className="form-grid cols-2">
                      <div className="form-group">
                        <label>14. تاریخ سیل / Sale Date</label>
                        <input type="date" className="form-control" value={newEntry.saleDate} onChange={e => setNewEntry({ ...newEntry, saleDate: e.target.value })} />
                      </div>
                    </div>

                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16 }}>15-18. ادائیگی (Advance & Bardana)</h4>
                    <div className="form-grid cols-2">
                      <div className="form-group">
                        <label>15. بیانہ / ایڈوانس / Advance Payment</label>
                        <input type="number" className="form-control" value={newEntry.advance || ''} onChange={e => setNewEntry({ ...newEntry, advance: Number(e.target.value) })} />
                      </div>
                      <div className="form-group">
                        <label>16. تاریخ بیانہ / Advance Date</label>
                        <input type="date" className="form-control" value={newEntry.advanceDate} onChange={e => setNewEntry({ ...newEntry, advanceDate: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>17. باردانہ / ایڈوانس / Bardana / Advance</label>
                        <input type="number" className="form-control" value={newEntry.bardana || ''} onChange={e => setNewEntry({ ...newEntry, bardana: Number(e.target.value) })} />
                      </div>
                      <div className="form-group">
                        <label>18. تاریخ باردانہ / Bardana Date</label>
                        <input type="date" className="form-control" value={newEntry.bardanaDate} onChange={e => setNewEntry({ ...newEntry, bardanaDate: e.target.value })} />
                      </div>
                    </div>

                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16 }}>بل کا خلاصہ (Bill Summary)</h4>

                    {/* Remarks */}
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label>Remarks / Notes (نوٹس)</label>
                      <input className="form-control" value={newEntry.remarks} onChange={e => setNewEntry({ ...newEntry, remarks: e.target.value })} placeholder="Optional notes about this entry..." />
                    </div>

                    {/* Payment Mode Toggle */}
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>22. صورت ادائیگی / Payment Method</label>
                      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                        {(['Cash', 'Credit'] as const).map(m => (
                          <label key={m} onClick={() => setNewEntry({ ...newEntry, paymentMode: m })} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            flex: 1, padding: '12px 0', borderRadius: 10, cursor: 'pointer',
                            border: `2px solid ${newEntry.paymentMode === m ? (m === 'Cash' ? 'var(--orange)' : 'var(--blue)') : 'var(--border)'}`,
                            background: newEntry.paymentMode === m ? (m === 'Cash' ? 'rgba(255,149,0,0.1)' : 'rgba(0,122,255,0.1)') : 'transparent',
                            fontWeight: newEntry.paymentMode === m ? 700 : 400, fontSize: '0.95rem',
                            color: newEntry.paymentMode === m ? (m === 'Cash' ? 'var(--orange)' : 'var(--blue)') : 'var(--text-secondary)',
                            transition: 'all 0.15s',
                          }}>
                            {m === 'Cash' ? '💵 نقد (Cash)' : '📋 ادھار (Credit)'}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* PAYMENT SECTION (19-21, 23-26) */}
                {(editMode === null || editMode === 'supplier' || editMode === 'payment') && (
                  <>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16, marginBottom: 12 }}>19-21. ادائیگی / Payment</h4>
                    {entryPayments.map((payment, idx) => (
                      <div key={payment.id} style={{ border: '1px solid var(--border)', padding: 12, marginBottom: 12, borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Payment {idx + 1}</span>
                          {entryPayments.length > 1 && (
                            <button type="button" className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => setEntryPayments(entryPayments.filter(p => p.id !== payment.id))}><X size={14} /></button>
                          )}
                        </div>
                        <div className="form-grid cols-2">
                          <div className="form-group">
                            <label>19. ادائیگی / Payment Amount</label>
                            <input type="number" className="form-control" value={payment.amount || ''} onChange={e => setEntryPayments(entryPayments.map(p => p.id === payment.id ? { ...p, amount: Number(e.target.value) } : p))} />
                          </div>
                          <div className="form-group">
                            <label>20. تاریخ ادائیگی / Payment Date</label>
                            <input type="date" className="form-control" value={payment.date} onChange={e => setEntryPayments(entryPayments.map(p => p.id === payment.id ? { ...p, date: e.target.value } : p))} />
                          </div>
                          <div className="form-group">
                            <label>21. صورت ادائیگی / Payment Method</label>
                            <select className="form-control" value={payment.method} onChange={e => setEntryPayments(entryPayments.map(p => p.id === payment.id ? { ...p, method: e.target.value as any } : p))}>
                              <option value="Cash">23. کیش / Cash</option>
                              <option value="Online">24. آن لائن / Online</option>
                              <option value="Bank">Bank</option>
                              <option value="Credit">Credit</option>
                            </select>
                          </div>
                          {(payment.method === 'Online' || payment.method === 'Bank') && (
                            <>
                              <div className="form-group">
                                <label>25. ادائیگی اکاؤنٹ نمبر / Payment Account Number</label>
                                <input className="form-control" value={payment.accountNo} onChange={e => setEntryPayments(entryPayments.map(p => p.id === payment.id ? { ...p, accountNo: e.target.value } : p))} placeholder="Account No" />
                              </div>
                              <div className="form-group">
                                <label>26. اکاؤنٹ ہولڈر نام / Account Holder Name</label>
                                <input className="form-control" value={payment.accountHolderName} onChange={e => setEntryPayments(entryPayments.map(p => p.id === payment.id ? { ...p, accountHolderName: e.target.value } : p))} placeholder="Holder Name" />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    <button type="button" className="btn btn-secondary" style={{ marginBottom: 16, fontSize: '0.75rem' }} onClick={() => setEntryPayments([...entryPayments, { id: Math.random().toString(), amount: 0, date: new Date().toISOString().split('T')[0], method: 'Cash', accountNo: '', accountHolderName: '' }])}>
                      <Plus size={14} style={{ marginRight: 4 }} /> Add Another Payment
                    </button>
                  </>
                )}

                {/* FINAL SUMMARY (27-29) */}
                <div style={{ background: 'var(--background)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: 12 }}>27-29. سمری / Summary</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>27. کل رقم / Grand Total Amount</span>
                    <span style={{ fontWeight: 600 }}>{fmt(grandTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Deductions (Labour + Carriage + Truck Fare)</span>
                    <span style={{ color: 'var(--red)', fontWeight: 600 }}>-{fmt(labourTotal + carriageTotal + Number(newEntry.truckFare))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>28. کل ادائیگی / Total Paid (Advance + Bardana + Payments)</span>
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>-{fmt(Number(newEntry.advance) + Number(newEntry.bardana) + totalPaidInEntry)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: '0.95rem', fontWeight: 700 }}>
                    <span>29. بقایا / Balance</span>
                    <span style={{ color: balance > 0 ? 'var(--orange)' : 'var(--green)' }}>{fmt(balance)}</span>
                  </div>
                </div>

              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--green)' }} disabled={isSaving}>
                  {isSaving ? 'Saving...' : (editMode ? 'Update Record' : 'Save Entry & Generate Bill')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierModule;
