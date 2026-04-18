
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

// ============================================
//  DATA TYPES (camelCase — matches pages)
// ============================================

export interface Expense {
  id: string;
  date: string;
  type: 'food' | 'salary' | 'rent' | 'parking' | 'other';
  amount: number;
  notes: string;
  addedBy: string;
  addedAtStr: string;
}

export interface Investor {
  id: string;
  name: string;
  investment: number;
  sharePercent: number;
}

export interface Partner {
  id: string;
  name: string;
  sharePercent: number;
}

export type SupplierStatus = 'active' | 'inactive';

export interface TruckParty {
  id: string;
  personName: string;
  crates: number;
  rate: number;
}

export interface TruckRecord {
  id: string;
  supplierId: string;
  truckNo: string;
  loadingDate: string;
  builtyNo: string;
  carriage: number;
  saleDate: string;
  advance: number;
  commPercent?: number;
  wariRate?: number;
  parties: TruckParty[];
  paymentMode: 'Cash' | 'Credit'; // how the supplier was paid
  remarks?: string;
  addedBy?: string;
  addedAtStr?: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  amount: number;
  date: string;
  method: 'Cash' | 'Bank' | 'Advance' | 'Credit';
  addedBy?: string;
  addedAtStr?: string;
}

export interface Supplier {
  id: string;
  name: string;
  city: string;
  status: SupplierStatus;
  trucks: TruckRecord[];
  payments: SupplierPayment[];
}

export interface CustomerSale {
  id: string;
  customerId: string;
  date: string;
  crates: number;
  rate: number;
  billNo: string;
  commPercent?: number;
  wariRate?: number;
  advance?: number;
  advanceMethod?: 'Cash' | 'Credit';
  discount?: number;       // flat discount deducted from net bill
  paymentMode?: 'Cash' | 'Credit';
  addedBy?: string;
  addedAtStr?: string;
}

export interface CustomerReturn {
  id: string;
  customerId: string;
  date: string;
  crates: number;
  newCost: number;         // agreed buyback value — reduces customer balance
  remarks: string;
  addedBy?: string;
  addedAtStr?: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  method: 'Cash' | 'Credit' | 'Bank';
  addedBy?: string;
  addedAtStr?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  nickname: string;
  sales: CustomerSale[];
  payments: CustomerPayment[];
  returns: CustomerReturn[];
}

export type UserRole = 'admin' | 'accountant' | 'salesman';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'inactive';
}

// ============================================
//  CALCULATION CONSTANTS
// ============================================

export const CASH_WARI_SUPPLIER = 10; // Rs per crate (requirement: 10)
export const CASH_WARI_CUSTOMER = 5;  // Rs per crate (requirement: 5)
export const CUSTOMER_COMMISSION_PERCENT = 7.25;
export const SUPPLIER_COMMISSION_PERCENT = 13.6;
export const CHARITY_PERCENT = 10;

// ============================================
//  CALCULATION HELPERS
// ============================================

export function calcTruckTotal(t: TruckRecord) {
  return (t.parties || []).reduce((s, p) => s + p.crates * p.rate, 0);
}
export function calcTruckCashWari(t: TruckRecord) {
  const crates = (t.parties || []).reduce((s, p) => s + p.crates, 0);
  return crates * (t.wariRate ?? CASH_WARI_SUPPLIER);
}
export function calcTruckCommission(t: TruckRecord) {
  return Math.round(calcTruckTotal(t) * (t.commPercent ?? SUPPLIER_COMMISSION_PERCENT) / 100);
}
export function calcTruckNet(t: TruckRecord) {
  return calcTruckTotal(t) - calcTruckCommission(t) - calcTruckCashWari(t);
}
export function calcSupplierTotalBill(s: Supplier) {
  return (s.trucks || []).reduce((acc, t) => acc + calcTruckNet(t), 0);
}
export function calcSupplierTotalAdvance(s: Supplier) {
  return (s.trucks || []).reduce((acc, t) => acc + t.advance, 0);
}
export function calcSupplierTotalCarriage(s: Supplier) {
  return (s.trucks || []).reduce((acc, t) => acc + t.carriage, 0);
}
export function calcSupplierTotalPayments(s: Supplier) {
  return (s.payments || []).reduce((acc, p) => acc + p.amount, 0);
}
export function calcSupplierGrossTotal(s: Supplier) {
  return (s.trucks || []).reduce((acc, t) => acc + calcTruckTotal(t), 0);
}
export function calcSupplierTotalReceived(s: Supplier) {
  return calcSupplierTotalAdvance(s) + calcSupplierTotalPayments(s);
}
export function calcSupplierBalance(s: Supplier) {
  return calcSupplierTotalBill(s) - calcSupplierTotalCarriage(s) - calcSupplierTotalAdvance(s) - calcSupplierTotalPayments(s);
}
export function calcSaleTotal(sale: CustomerSale) { return sale.crates * sale.rate; }
export function calcSaleCommission(sale: CustomerSale) {
  return Math.round(calcSaleTotal(sale) * (sale.commPercent ?? CUSTOMER_COMMISSION_PERCENT) / 100);
}
export function calcSaleCashWari(sale: CustomerSale) {
  return sale.crates * (sale.wariRate ?? CASH_WARI_CUSTOMER);
}
export function calcSaleNet(sale: CustomerSale) {
  return calcSaleTotal(sale) + calcSaleCommission(sale) + calcSaleCashWari(sale);
}
export function calcSaleNetAfterDiscount(sale: CustomerSale) {
  return calcSaleNet(sale) - (sale.discount ?? 0);
}
export function calcCustomerTotalBill(c: Customer) {
  const salesTotal = (c.sales || []).reduce((acc, s) => acc + calcSaleNetAfterDiscount(s), 0);
  const returnsTotal = (c.returns || []).reduce((acc, r) => acc + r.newCost, 0);
  return salesTotal - returnsTotal;
}
export function calcCustomerTotalPayments(c: Customer) {
  return (c.payments || []).reduce((acc, p) => acc + p.amount, 0);
}
export function calcCustomerTotalAdvance(c: Customer) {
  return (c.sales || []).reduce((acc, s) => acc + (s.advance ?? 0), 0);
}
export function calcCustomerTotalReturns(c: Customer) {
  // newCost = reduction amount (original sale value - new agreed value)
  return (c.returns || []).reduce((acc, r) => acc + r.newCost, 0);
}
export function calcCustomerTotalDiscount(c: Customer) {
  return (c.sales || []).reduce((acc, s) => acc + (s.discount ?? 0), 0);
}
export function calcCustomerBalance(c: Customer) {
  return calcCustomerTotalBill(c)
    - calcCustomerTotalPayments(c)
    - calcCustomerTotalAdvance(c);
}

// ============================================
//  DB ROW MAPPERS (snake_case <-> camelCase)
// ============================================

function mapExpense(r: any): Expense {
  return { id: r.id, date: r.date, type: r.type, amount: r.amount, notes: r.notes || '', addedBy: r.added_by || '', addedAtStr: r.added_at_str || '' };
}
function expenseToRow(e: Expense) {
  return { id: e.id, date: e.date || null, type: e.type, amount: e.amount, notes: e.notes, added_by: e.addedBy, added_at_str: e.addedAtStr };
}
function mapInvestor(r: any): Investor {
  return { id: r.id, name: r.name, investment: r.investment, sharePercent: r.share_percent };
}
function investorToRow(i: Investor) {
  return { id: i.id, name: i.name, investment: i.investment, share_percent: i.sharePercent };
}
function mapPartner(r: any): Partner {
  return { id: r.id, name: r.name, sharePercent: r.share_percent };
}
function partnerToRow(p: Partner) {
  return { id: p.id, name: p.name, share_percent: p.sharePercent };
}
function mapTruck(r: any): TruckRecord {
  return {
    id: r.id, supplierId: r.supplier_id, truckNo: r.truck_no, loadingDate: r.loading_date,
    builtyNo: r.builty_no || '', carriage: r.carriage, saleDate: r.sale_date || '',
    advance: r.advance, commPercent: r.comm_percent, wariRate: r.wari_rate,
    parties: r.parties || [], paymentMode: r.payment_mode ?? 'Credit',
    remarks: r.remarks || '',
    addedBy: r.added_by, addedAtStr: r.added_at_str,
  };
}
function truckToRow(t: TruckRecord) {
  return {
    id: t.id, supplier_id: t.supplierId, truck_no: t.truckNo, loading_date: t.loadingDate || null,
    builty_no: t.builtyNo || null, carriage: t.carriage, sale_date: t.saleDate || null,
    advance: t.advance, comm_percent: t.commPercent ?? null, wari_rate: t.wariRate ?? null,
    parties: t.parties, payment_mode: t.paymentMode ?? 'Credit',
    remarks: t.remarks || null,
    added_by: t.addedBy, added_at_str: t.addedAtStr,
  };
}
function mapSupplierPayment(r: any): SupplierPayment {
  return { id: r.id, supplierId: r.supplier_id, amount: r.amount, date: r.date, method: r.method, addedBy: r.added_by, addedAtStr: r.added_at_str };
}
function supplierPaymentToRow(p: SupplierPayment) {
  return { id: p.id, supplier_id: p.supplierId, amount: p.amount, date: p.date || null, method: p.method, added_by: p.addedBy, added_at_str: p.addedAtStr };
}
function mapSale(r: any): CustomerSale {
  return {
    id: r.id, customerId: r.customer_id, date: r.date, crates: r.crates, rate: r.rate,
    billNo: r.bill_no || '', commPercent: r.comm_percent, wariRate: r.wari_rate,
    advance: r.advance ?? 0, advanceMethod: r.advance_method ?? 'Cash',
    discount: r.discount ?? 0,
    paymentMode: r.payment_mode ?? 'Credit',
    addedBy: r.added_by, addedAtStr: r.added_at_str,
  };
}
function saleToRow(s: CustomerSale) {
  return {
    id: s.id, customer_id: s.customerId, date: s.date || null, crates: s.crates, rate: s.rate,
    bill_no: s.billNo || null, comm_percent: s.commPercent ?? null, wari_rate: s.wariRate ?? null,
    advance: s.advance ?? 0, advance_method: s.advanceMethod ?? 'Cash',
    discount: s.discount ?? 0,
    payment_mode: s.paymentMode ?? 'Credit',
    added_by: s.addedBy, added_at_str: s.addedAtStr,
  };
}
function mapCustomerReturn(r: any): CustomerReturn {
  return {
    id: r.id, customerId: r.customer_id, date: r.date,
    crates: r.crates, newCost: r.new_cost, remarks: r.remarks || '',
    addedBy: r.added_by, addedAtStr: r.added_at_str,
  };
}
function customerReturnToRow(r: CustomerReturn) {
  return {
    id: r.id, customer_id: r.customerId, date: r.date || null,
    crates: r.crates, new_cost: r.newCost, remarks: r.remarks,
    added_by: r.addedBy, added_at_str: r.addedAtStr,
  };
}
function mapCustomerPayment(r: any): CustomerPayment {
  return { id: r.id, customerId: r.customer_id, amount: r.amount, date: r.date, method: r.method, addedBy: r.added_by, addedAtStr: r.added_at_str };
}
function customerPaymentToRow(p: CustomerPayment) {
  return { id: p.id, customer_id: p.customerId, amount: p.amount, date: p.date || null, method: p.method, added_by: p.addedBy, added_at_str: p.addedAtStr };
}
function mapUser(r: any): AppUser {
  return { id: r.id, name: r.name, email: r.email, password: r.password, role: r.role, status: r.status };
}

// ============================================
//  STORE HOOK
// ============================================

function loadFromLS<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
const genId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const nowStr = () => new Date().toLocaleString();

export function useMandiStore() {
  const [activeUser, setActiveUser] = useState<AppUser | null>(() => loadFromLS('abbasi_active_user', null));
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  const getMeta = () => ({ addedBy: activeUser?.name ?? 'System', addedAtStr: nowStr() });

  const setAndSaveActiveUser = (u: AppUser | null) => {
    setActiveUser(u);
    localStorage.setItem('abbasi_active_user', JSON.stringify(u));
  };

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          supabase.from('expenses').select('*').order('date', { ascending: false }),
          supabase.from('investors').select('*'),
          supabase.from('partners').select('*'),
          supabase.from('suppliers').select('*').order('name'),
          supabase.from('truck_records').select('*').order('loading_date', { ascending: false }),
          supabase.from('supplier_payments').select('*').order('date', { ascending: false }),
          supabase.from('customers').select('*').order('name'),
          supabase.from('customer_sales').select('*').order('date', { ascending: false }),
          supabase.from('customer_payments').select('*').order('date', { ascending: false }),
          supabase.from('app_users').select('*'),
          supabase.from('customer_returns').select('*').order('date', { ascending: false }),
        ]);

        const get = (i: number, name: string) => {
          const r = results[i];
          if (r.status === 'rejected') { console.error(`[DB] ${name} rejected:`, r.reason); return []; }
          if (r.value.error) { console.error(`[DB] ${name} error:`, r.value.error.message); setDbError(`Table "${name}" failed: ${r.value.error.message}`); return []; }
          console.log(`[DB] ${name}: ${r.value.data?.length ?? 0} rows`);
          return r.value.data || [];
        };

        const expData = get(0, 'expenses');
        const invData = get(1, 'investors');
        const parData = get(2, 'partners');
        const supData = get(3, 'suppliers');
        const truckData = get(4, 'truck_records');
        const supPayData = get(5, 'supplier_payments');
        const custData = get(6, 'customers');
        const saleData = get(7, 'customer_sales');
        const custPayData = get(8, 'customer_payments');
        const userData = get(9, 'app_users');
        const returnData = get(10, 'customer_returns');

        setExpenses(expData.map(mapExpense));
        setInvestors(invData.map(mapInvestor));
        setPartners(parData.map(mapPartner));

        const trucks = truckData.map(mapTruck);
        const supPays = supPayData.map(mapSupplierPayment);
        setSuppliers((supData as any[]).map(s => ({
          id: s.id, name: s.name, city: s.city, status: s.status,
          trucks: trucks.filter(t => t.supplierId === s.id),
          payments: supPays.filter(p => p.supplierId === s.id),
        })));

        const sales = saleData.map(mapSale);
        const custPays = custPayData.map(mapCustomerPayment);
        const custReturns = returnData.map(mapCustomerReturn);
        setCustomers((custData as any[]).map(c => ({
          id: c.id, name: c.name, phone: c.phone || '', nickname: c.nickname || '',
          sales: sales.filter(s => s.customerId === c.id),
          payments: custPays.filter(p => p.customerId === c.id),
          returns: custReturns.filter(r => r.customerId === c.id),
        })));

        const uList = (userData as any[]).map(mapUser);
        if (uList.length === 0) {
          const admin: AppUser = { id: genId(), name: 'Admin (ایڈمن)', email: 'admin', password: '123', role: 'admin', status: 'active' };
          await supabase.from('app_users').insert({ id: admin.id, name: admin.name, email: admin.email, password: admin.password, role: admin.role, status: admin.status });
          setUsers([admin]);
        } else {
          setUsers(uList);
        }
      } catch (e) {
        console.error('Supabase load error:', e);
        setDbError('Failed to load data. Check console for details.');
      }
      setLoading(false);
    }
    loadAll();
  }, []);

  // ── Expenses ──
  const addExpense = async (e: Omit<Expense, 'id'>) => {
    const row: Expense = { ...e, id: genId(), ...getMeta() };
    setExpenses(prev => [row, ...prev]);
    await supabase.from('expenses').insert(expenseToRow(row));
  };
  const updateExpense = async (id: string, u: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...u } : e));
    const dbU: any = {};
    if (u.date !== undefined) dbU.date = u.date;
    if (u.type !== undefined) dbU.type = u.type;
    if (u.amount !== undefined) dbU.amount = u.amount;
    if (u.notes !== undefined) dbU.notes = u.notes;
    const { error } = await supabase.from('expenses').update(dbU).eq('id', id);
    if (error) console.error('updateExpense failed:', error.message);
  };
  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    await supabase.from('expenses').delete().eq('id', id);
  };

  // ── Investors ──
  const addInvestor = async (i: Omit<Investor, 'id'>) => {
    const row: Investor = { ...i, id: genId() };
    setInvestors(prev => [...prev, row]);
    await supabase.from('investors').insert(investorToRow(row));
  };
  const updateInvestor = async (id: string, u: Partial<Investor>) => {
    setInvestors(prev => prev.map(i => i.id === id ? { ...i, ...u } : i));
    const dbU: any = {};
    if (u.name !== undefined) dbU.name = u.name;
    if (u.investment !== undefined) dbU.investment = u.investment;
    if (u.sharePercent !== undefined) dbU.share_percent = u.sharePercent;
    await supabase.from('investors').update(dbU).eq('id', id);
  };
  const deleteInvestor = async (id: string) => {
    setInvestors(prev => prev.filter(i => i.id !== id));
    await supabase.from('investors').delete().eq('id', id);
  };

  // ── Partners ──
  const addPartner = async (p: Omit<Partner, 'id'>) => {
    const row: Partner = { ...p, id: genId() };
    setPartners(prev => [...prev, row]);
    await supabase.from('partners').insert(partnerToRow(row));
  };
  const updatePartner = async (id: string, u: Partial<Partner>) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, ...u } : p));
    const dbU: any = {};
    if (u.name !== undefined) dbU.name = u.name;
    if (u.sharePercent !== undefined) dbU.share_percent = u.sharePercent;
    await supabase.from('partners').update(dbU).eq('id', id);
  };
  const deletePartner = async (id: string) => {
    setPartners(prev => prev.filter(p => p.id !== id));
    await supabase.from('partners').delete().eq('id', id);
  };

  // ── Suppliers ──
  const addSupplierWithFirstTruck = async (
    supplierData: Omit<Supplier, 'id' | 'trucks' | 'payments'>,
    truckData: Omit<TruckRecord, 'id' | 'supplierId'>,
    payments: { amount: number; date: string; method: 'Cash' | 'Credit' | 'Bank' }[] = []
  ) => {
    const meta = getMeta();
    const existing = suppliers.find(
      s => s.name.trim().toLowerCase() === supplierData.name.trim().toLowerCase() &&
           s.city.trim().toLowerCase() === supplierData.city.trim().toLowerCase()
    );
    const supplierId = existing ? existing.id : genId();
    const newTruck: TruckRecord = { ...truckData, id: genId(), supplierId, ...meta };
    const newPayments: SupplierPayment[] = payments
      .filter(p => p.amount > 0)
      .map(p => ({ ...p, id: genId(), supplierId, ...meta }));

    if (existing) {
      setSuppliers(prev => prev.map(s => s.id === supplierId
        ? { ...s, trucks: [...s.trucks, newTruck], payments: [...s.payments, ...newPayments] }
        : s));
    } else {
      const newSupplier: Supplier = { ...supplierData, id: supplierId, trucks: [newTruck], payments: newPayments };
      setSuppliers(prev => [...prev, newSupplier]);
      const { error: se } = await supabase.from('suppliers').insert({ id: supplierId, name: supplierData.name, city: supplierData.city, status: supplierData.status });
      if (se) { console.error('[DB] insert supplier failed:', se.message); setDbError(`Supplier save failed: ${se.message}`); return; }
    }
    const { error: te } = await supabase.from('truck_records').insert(truckToRow(newTruck));
    if (te) { console.error('[DB] insert truck failed:', te.message); setDbError(`Truck save failed: ${te.message}`); return; }
    if (newPayments.length > 0) {
      const { error: pe } = await supabase.from('supplier_payments').insert(newPayments.map(supplierPaymentToRow));
      if (pe) console.error('[DB] insert supplier payments failed:', pe.message);
    }
  };

  const updateSupplier = async (id: string, u: Partial<Pick<Supplier, 'name' | 'city' | 'status'>>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...u } : s));
    await supabase.from('suppliers').update(u).eq('id', id);
  };
  const deleteSupplier = async (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    await supabase.from('suppliers').delete().eq('id', id);
  };
  const addTruckToSupplier = async (supplierId: string, truck: Omit<TruckRecord, 'id' | 'supplierId'>) => {
    const row: TruckRecord = { ...truck, id: genId(), supplierId, ...getMeta() };
    setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, trucks: [...s.trucks, row] } : s));
    const { error } = await supabase.from('truck_records').insert(truckToRow(row));
    if (error) { console.error('[DB] insert truck failed:', error.message); setDbError(`Truck save failed: ${error.message}`); }
  };
  const updateTruck = async (supplierId: string, truckId: string, u: Partial<TruckRecord>) => {
    setSuppliers(prev => prev.map(s => s.id === supplierId
      ? { ...s, trucks: s.trucks.map(t => t.id === truckId ? { ...t, ...u } : t) } : s));
    const dbU: any = {};
    if (u.truckNo !== undefined) dbU.truck_no = u.truckNo;
    if (u.loadingDate !== undefined) dbU.loading_date = u.loadingDate;
    if (u.builtyNo !== undefined) dbU.builty_no = u.builtyNo;
    if (u.carriage !== undefined) dbU.carriage = u.carriage;
    if (u.saleDate !== undefined) dbU.sale_date = u.saleDate;
    if (u.advance !== undefined) dbU.advance = u.advance;
    if (u.commPercent !== undefined) dbU.comm_percent = u.commPercent;
    if (u.wariRate !== undefined) dbU.wari_rate = u.wariRate;
    if (u.parties !== undefined) dbU.parties = u.parties;
    if (u.paymentMode !== undefined) dbU.payment_mode = u.paymentMode;
    if (u.remarks !== undefined) dbU.remarks = u.remarks;
    await supabase.from('truck_records').update(dbU).eq('id', truckId);
  };
  const deleteTruck = async (supplierId: string, truckId: string) => {
    setSuppliers(prev => prev.map(s => s.id === supplierId
      ? { ...s, trucks: s.trucks.filter(t => t.id !== truckId) } : s));
    await supabase.from('truck_records').delete().eq('id', truckId);
  };
  const addPaymentToSupplier = async (supplierId: string, payment: Omit<SupplierPayment, 'id' | 'supplierId'>) => {
    const row: SupplierPayment = { ...payment, id: genId(), supplierId, ...getMeta() };
    setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, payments: [...s.payments, row] } : s));
    await supabase.from('supplier_payments').insert(supplierPaymentToRow(row));
  };
  const updateSupplierPayment = async (supplierId: string, paymentId: string, u: Partial<SupplierPayment>) => {
    setSuppliers(prev => prev.map(s => s.id === supplierId
      ? { ...s, payments: s.payments.map(p => p.id === paymentId ? { ...p, ...u } : p) } : s));
    const dbU: any = {};
    if (u.amount !== undefined) dbU.amount = u.amount;
    if (u.date !== undefined) dbU.date = u.date;
    if (u.method !== undefined) dbU.method = u.method;
    await supabase.from('supplier_payments').update(dbU).eq('id', paymentId);
  };
  const deleteSupplierPayment = async (supplierId: string, paymentId: string) => {
    setSuppliers(prev => prev.map(s => s.id === supplierId
      ? { ...s, payments: s.payments.filter(p => p.id !== paymentId) } : s));
    await supabase.from('supplier_payments').delete().eq('id', paymentId);
  };

  // ── Customers ──
  const addCustomerWithFirstSale = async (
    customerData: Omit<Customer, 'id' | 'sales' | 'payments' | 'returns'>,
    saleData: Omit<CustomerSale, 'id' | 'customerId'>,
    payments: { amount: number; date: string; method: 'Cash' | 'Credit' | 'Bank' }[] = []
  ): Promise<string> => {  // returns customerId
    const meta = getMeta();
    const existing = customers.find(
      c => c.name.trim().toLowerCase() === customerData.name.trim().toLowerCase() &&
           c.nickname.trim().toLowerCase() === customerData.nickname.trim().toLowerCase()
    );
    const customerId = existing ? existing.id : genId();
    const newSale: CustomerSale = { ...saleData, id: genId(), customerId, ...meta };
    const newPayments: CustomerPayment[] = payments
      .filter(p => p.amount > 0)
      .map(p => ({ ...p, id: genId(), customerId, ...meta }));

    if (existing) {
      setCustomers(prev => prev.map(c => c.id === customerId
        ? { ...c, sales: [...c.sales, newSale], payments: [...c.payments, ...newPayments] } : c));
    } else {
      setCustomers(prev => [...prev, { ...customerData, id: customerId, sales: [newSale], payments: newPayments, returns: [] }]);
      const { error: ce } = await supabase.from('customers').insert({ id: customerId, name: customerData.name, phone: customerData.phone, nickname: customerData.nickname });
      if (ce) { console.error('insert customer failed:', ce.message); return customerId; }
    }
    const { error: se } = await supabase.from('customer_sales').insert(saleToRow(newSale));
    if (se) console.error('insert sale failed:', se.message, saleToRow(newSale));
    if (newPayments.length > 0) {
      const { error: pe } = await supabase.from('customer_payments').insert(newPayments.map(customerPaymentToRow));
      if (pe) console.error('insert payments failed:', pe.message);
    }
    return customerId;
  };

  const updateCustomer = async (id: string, u: Partial<Pick<Customer, 'name' | 'phone' | 'nickname'>>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...u } : c));
    await supabase.from('customers').update(u).eq('id', id);
  };
  const deleteCustomer = async (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    await supabase.from('customers').delete().eq('id', id);
  };
  const addSaleToCustomer = async (customerId: string, sale: Omit<CustomerSale, 'id' | 'customerId'>) => {
    const row: CustomerSale = { ...sale, id: genId(), customerId, ...getMeta() };
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, sales: [...c.sales, row] } : c));
    const { error } = await supabase.from('customer_sales').insert(saleToRow(row));
    if (error) { console.error('[DB] addSaleToCustomer failed:', error.message, saleToRow(row)); setDbError(`Sale save failed: ${error.message}`); }
  };
  const updateCustomerSale = async (customerId: string, saleId: string, u: Partial<CustomerSale>) => {
    setCustomers(prev => prev.map(c => c.id === customerId
      ? { ...c, sales: c.sales.map(s => s.id === saleId ? { ...s, ...u } : s) } : c));
    const dbU: any = {};
    if (u.date !== undefined) dbU.date = u.date;
    if (u.crates !== undefined) dbU.crates = u.crates;
    if (u.rate !== undefined) dbU.rate = u.rate;
    if (u.billNo !== undefined) dbU.bill_no = u.billNo;
    if (u.commPercent !== undefined) dbU.comm_percent = u.commPercent;
    if (u.wariRate !== undefined) dbU.wari_rate = u.wariRate;
    if (u.advance !== undefined) dbU.advance = u.advance;
    if (u.advanceMethod !== undefined) dbU.advance_method = u.advanceMethod;
    if (u.discount !== undefined) dbU.discount = u.discount;
    if (u.paymentMode !== undefined) dbU.payment_mode = u.paymentMode;
    const { error } = await supabase.from('customer_sales').update(dbU).eq('id', saleId);
    if (error) { console.error('updateCustomerSale failed:', error.message, dbU); setDbError(`Sale update failed: ${error.message}`); }
  };
  const deleteCustomerSale = async (customerId: string, saleId: string) => {
    setCustomers(prev => prev.map(c => c.id === customerId
      ? { ...c, sales: c.sales.filter(s => s.id !== saleId) } : c));
    await supabase.from('customer_sales').delete().eq('id', saleId);
  };
  const addPaymentToCustomer = async (customerId: string, payment: Omit<CustomerPayment, 'id' | 'customerId'>) => {
    const row: CustomerPayment = { ...payment, id: genId(), customerId, ...getMeta() };
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, payments: [...c.payments, row] } : c));
    const { error } = await supabase.from('customer_payments').insert(customerPaymentToRow(row));
    if (error) console.error('addPaymentToCustomer failed:', error.message);
  };
  const updateCustomerPayment = async (customerId: string, paymentId: string, u: Partial<CustomerPayment>) => {
    setCustomers(prev => prev.map(c => c.id === customerId
      ? { ...c, payments: c.payments.map(p => p.id === paymentId ? { ...p, ...u } : p) } : c));
    const dbU: any = {};
    if (u.amount !== undefined) dbU.amount = u.amount;
    if (u.date !== undefined) dbU.date = u.date;
    if (u.method !== undefined) dbU.method = u.method;
    const { error } = await supabase.from('customer_payments').update(dbU).eq('id', paymentId);
    if (error) { console.error('updateCustomerPayment failed:', error.message, dbU); setDbError(`Payment update failed: ${error.message}`); }
  };
  const deleteCustomerPayment = async (customerId: string, paymentId: string) => {
    setCustomers(prev => prev.map(c => c.id === customerId
      ? { ...c, payments: c.payments.filter(p => p.id !== paymentId) } : c));
    await supabase.from('customer_payments').delete().eq('id', paymentId);
  };

  // ── Customer Returns ──
  const addReturnToCustomer = async (customerId: string, ret: Omit<CustomerReturn, 'id' | 'customerId'>) => {
    const row: CustomerReturn = { ...ret, id: genId(), customerId, ...getMeta() };
    setCustomers(prev => prev.map(c => c.id === customerId
      ? { ...c, returns: [...(c.returns || []), row] } : c));
    const { error } = await supabase.from('customer_returns').insert(customerReturnToRow(row));
    if (error) { console.error('[DB] insert return failed:', error.message); setDbError(`Return save failed: ${error.message}`); }
  };
  const updateCustomerReturn = async (customerId: string, returnId: string, u: Partial<CustomerReturn>) => {
    setCustomers(prev => prev.map(c => c.id === customerId
      ? { ...c, returns: (c.returns || []).map(r => r.id === returnId ? { ...r, ...u } : r) } : c));
    const dbU: any = {};
    if (u.date !== undefined) dbU.date = u.date;
    if (u.crates !== undefined) dbU.crates = u.crates;
    if (u.newCost !== undefined) dbU.new_cost = u.newCost;
    if (u.remarks !== undefined) dbU.remarks = u.remarks;
    const { error } = await supabase.from('customer_returns').update(dbU).eq('id', returnId);
    if (error) console.error('[DB] update return failed:', error.message);
  };
  const deleteCustomerReturn = async (customerId: string, returnId: string) => {
    setCustomers(prev => prev.map(c => c.id === customerId
      ? { ...c, returns: (c.returns || []).filter(r => r.id !== returnId) } : c));
    await supabase.from('customer_returns').delete().eq('id', returnId);
  };

  // ── Users ──
  const addUser = async (u: Omit<AppUser, 'id'>) => {
    const row: AppUser = { ...u, id: genId() };
    setUsers(prev => [...prev, row]);
    await supabase.from('app_users').insert({ id: row.id, name: row.name, email: row.email, password: row.password, role: row.role, status: row.status });
  };
  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    await supabase.from('app_users').delete().eq('id', id);
  };

  const getNextBillNo = () => {
    const nums = customers.flatMap(c => c.sales.map(s => parseInt((s.billNo || '').replace(/\D/g, '')) || 0));
    return ((nums.length > 0 ? Math.max(...nums) : 1000) + 1).toString();
  };

  // ── Aggregates ──
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Revenue = all commissions + all wari (supplier + customer)
  const totalSupplierComm = suppliers.reduce((s, sp) => s + sp.trucks.reduce((ss, t) => ss + calcTruckCommission(t), 0), 0);
  const totalSupplierWari = suppliers.reduce((s, sp) => s + sp.trucks.reduce((ss, t) => ss + calcTruckCashWari(t), 0), 0);
  const totalCustomerComm = customers.reduce((s, c) => s + c.sales.reduce((ss, sl) => ss + calcSaleCommission(sl), 0), 0);
  const totalCustomerWari = customers.reduce((s, c) => s + c.sales.reduce((ss, sl) => ss + calcSaleCashWari(sl), 0), 0);
  const totalRevenue = totalSupplierComm + totalSupplierWari + totalCustomerComm + totalCustomerWari;

  const totalSales = customers.reduce((s, c) => s + c.sales.reduce((ss, sl) => ss + calcSaleTotal(sl), 0), 0);
  const totalPurchases = suppliers.reduce((s, sp) => s + sp.trucks.reduce((ss, t) => ss + calcTruckTotal(t), 0), 0);

  // Gross profit = revenue - expenses
  const grossProfit = totalRevenue - totalExpenses;
  // 10% charity on gross profit
  const charity = Math.round(Math.max(0, grossProfit) * CHARITY_PERCENT / 100);
  const afterCharity = grossProfit - charity;

  // Deduct investor and partner shares from after-charity profit
  const totalInvestorShare = Math.round(investors.reduce((s, inv) => s + Math.max(0, afterCharity) * inv.sharePercent / 100, 0));
  const totalPartnerShare = Math.round(partners.reduce((s, p) => s + Math.max(0, afterCharity) * p.sharePercent / 100, 0));

  // Net profit = what remains after all deductions
  const totalProfit = grossProfit;
  const netProfit = afterCharity - totalInvestorShare - totalPartnerShare;
  const turnover = totalSales;

  return {
    loading, dbError,
    expenses, investors, partners, suppliers, customers, users, activeUser,
    addExpense, updateExpense, deleteExpense,
    addInvestor, updateInvestor, deleteInvestor,
    addPartner, updatePartner, deletePartner,
    addSupplierWithFirstTruck, updateSupplier, deleteSupplier,
    addTruckToSupplier, updateTruck, deleteTruck,
    addPaymentToSupplier, updateSupplierPayment, deleteSupplierPayment,
    addCustomerWithFirstSale, updateCustomer, deleteCustomer,
    addSaleToCustomer, updateCustomerSale, deleteCustomerSale,
    addPaymentToCustomer, updateCustomerPayment, deleteCustomerPayment,
    addReturnToCustomer, updateCustomerReturn, deleteCustomerReturn,
    addUser, deleteUser, setAndSaveActiveUser, getNextBillNo,
    totalExpenses, totalRevenue, totalSales, totalPurchases,
    totalProfit, charity, netProfit, turnover,
    totalSupplierComm, totalSupplierWari, totalCustomerComm, totalCustomerWari,
    grossProfit, afterCharity, totalInvestorShare, totalPartnerShare,
  };
}

// ── Context ──
type StoreType = ReturnType<typeof useMandiStore>;
export const StoreContext = createContext<StoreType | null>(null);
export function useStore(): StoreType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreContext.Provider');
  return ctx;
}
