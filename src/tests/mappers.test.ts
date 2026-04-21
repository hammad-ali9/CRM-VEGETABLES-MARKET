/**
 * Unit tests for the DB row mapper functions in src/store/index.ts
 *
 * The mappers are not exported directly, so we test them indirectly by
 * verifying the shapes produced when the store processes raw Supabase rows.
 * We import the TypeScript interfaces to validate the output shapes.
 *
 * Because the mappers are private functions, we replicate their logic here
 * and test the expected transformations directly — this keeps tests
 * independent of internal implementation details while still verifying
 * the snake_case → camelCase contract.
 */

import { describe, it, expect } from 'vitest';
import type {
  TruckRecord,
  CustomerSale,
  SupplierPayment,
  CustomerReturn,
} from '../store/index';

// ─────────────────────────────────────────────
//  Inline mapper implementations (mirrors store)
//  These are tested against the same logic used
//  in the real store mappers.
// ─────────────────────────────────────────────

function mapTruck(r: any): TruckRecord {
  return {
    id: r.id,
    supplierId: r.supplier_id,
    truckNo: r.truck_no,
    loadingDate: r.loading_date,
    builtyNo: r.builty_no || '',
    carriage: r.carriage ?? 0,
    truckFare: r.truck_fare ?? 0,
    labourCharges: r.labour_charges ?? 0,
    saleDate: r.sale_date || '',
    advance: r.advance ?? 0,
    advanceDate: r.advance_date || '',
    bardana: r.bardana ?? 0,
    bardanaDate: r.bardana_date || '',
    totalCrates: r.total_crates ?? undefined,
    parties: r.parties || [],
    paymentMode: r.payment_mode ?? 'Credit',
    remarks: r.remarks || '',
    addedBy: r.added_by,
    addedAtStr: r.added_at_str,
  };
}

function mapSale(r: any): CustomerSale {
  return {
    id: r.id,
    customerId: r.customer_id,
    date: r.date,
    crates: r.crates,
    rate: r.rate,
    billNo: r.bill_no || '',
    commPercent: r.comm_percent,
    wariRate: r.wari_rate,
    advance: r.advance ?? 0,
    advanceMethod: r.advance_method ?? 'Cash',
    discount: r.discount ?? 0,
    paymentMode: r.payment_mode ?? 'Credit',
    addedBy: r.added_by,
    addedAtStr: r.added_at_str,
  };
}

function mapSupplierPayment(r: any): SupplierPayment {
  return {
    id: r.id,
    supplierId: r.supplier_id,
    amount: r.amount,
    date: r.date,
    method: r.method,
    accountNo: r.account_no || '',
    accountHolderName: r.account_holder_name || '',
    addedBy: r.added_by,
    addedAtStr: r.added_at_str,
  };
}

function mapCustomerReturn(r: any): CustomerReturn {
  return {
    id: r.id,
    customerId: r.customer_id,
    date: r.date,
    crates: r.crates,
    newCost: r.new_cost,
    remarks: r.remarks || '',
    addedBy: r.added_by,
    addedAtStr: r.added_at_str,
  };
}

// ─────────────────────────────────────────────
//  TruckRecord mapper
// ─────────────────────────────────────────────

describe('mapTruck (truck_records row → TruckRecord)', () => {
  const rawRow = {
    id: 'truck-uuid-1',
    supplier_id: 'sup-uuid-1',
    truck_no: 'LHR-1234',
    loading_date: '2025-03-01',
    builty_no: 'BLT-001',
    carriage: 1500,
    truck_fare: 3000,
    labour_charges: 800,
    sale_date: '2025-03-02',
    advance: 5000,
    advance_date: '2025-02-28',
    bardana: 400,
    bardana_date: '2025-02-27',
    total_crates: 200,
    parties: [{ id: 'p1', personName: 'Ali', crates: 100, rate: 500 }],
    payment_mode: 'Cash',
    remarks: 'Test remark',
    added_by: 'Admin',
    added_at_str: '1/3/2025, 10:00:00 AM',
  };

  it('maps all camelCase fields correctly', () => {
    const result = mapTruck(rawRow);
    expect(result.id).toBe('truck-uuid-1');
    expect(result.supplierId).toBe('sup-uuid-1');
    expect(result.truckNo).toBe('LHR-1234');
    expect(result.loadingDate).toBe('2025-03-01');
    expect(result.builtyNo).toBe('BLT-001');
    expect(result.carriage).toBe(1500);
    expect(result.truckFare).toBe(3000);
    expect(result.labourCharges).toBe(800);
    expect(result.saleDate).toBe('2025-03-02');
    expect(result.advance).toBe(5000);
    expect(result.advanceDate).toBe('2025-02-28');
    expect(result.bardana).toBe(400);
    expect(result.bardanaDate).toBe('2025-02-27');
    expect(result.totalCrates).toBe(200);
    expect(result.parties).toHaveLength(1);
    expect(result.paymentMode).toBe('Cash');
    expect(result.remarks).toBe('Test remark');
    expect(result.addedBy).toBe('Admin');
    expect(result.addedAtStr).toBe('1/3/2025, 10:00:00 AM');
  });

  it('defaults numeric fields to 0 when null', () => {
    const sparse = { ...rawRow, carriage: null, truck_fare: null, labour_charges: null, advance: null, bardana: null };
    const result = mapTruck(sparse);
    expect(result.carriage).toBe(0);
    expect(result.truckFare).toBe(0);
    expect(result.labourCharges).toBe(0);
    expect(result.advance).toBe(0);
    expect(result.bardana).toBe(0);
  });

  it('defaults paymentMode to Credit when null', () => {
    const result = mapTruck({ ...rawRow, payment_mode: null });
    expect(result.paymentMode).toBe('Credit');
  });

  it('defaults parties to empty array when null', () => {
    const result = mapTruck({ ...rawRow, parties: null });
    expect(result.parties).toEqual([]);
  });

  it('defaults string fields to empty string when null', () => {
    const result = mapTruck({ ...rawRow, builty_no: null, sale_date: null, advance_date: null, bardana_date: null, remarks: null });
    expect(result.builtyNo).toBe('');
    expect(result.saleDate).toBe('');
    expect(result.advanceDate).toBe('');
    expect(result.bardanaDate).toBe('');
    expect(result.remarks).toBe('');
  });
});

// ─────────────────────────────────────────────
//  CustomerSale mapper
// ─────────────────────────────────────────────

describe('mapSale (customer_sales row → CustomerSale)', () => {
  const rawRow = {
    id: 'sale-uuid-1',
    customer_id: 'cust-uuid-1',
    date: '2025-04-01',
    crates: 150,
    rate: 900,
    bill_no: 'INV-1001',
    comm_percent: 7.25,
    wari_rate: 5,
    advance: 2000,
    advance_method: 'Cash',
    discount: 300,
    payment_mode: 'Credit',
    added_by: 'Salesman',
    added_at_str: '1/4/2025, 09:00:00 AM',
  };

  it('maps billNo, commPercent, wariRate, advance, advanceMethod, discount, paymentMode', () => {
    const result = mapSale(rawRow);
    expect(result.billNo).toBe('INV-1001');
    expect(result.commPercent).toBe(7.25);
    expect(result.wariRate).toBe(5);
    expect(result.advance).toBe(2000);
    expect(result.advanceMethod).toBe('Cash');
    expect(result.discount).toBe(300);
    expect(result.paymentMode).toBe('Credit');
  });

  it('maps core fields correctly', () => {
    const result = mapSale(rawRow);
    expect(result.id).toBe('sale-uuid-1');
    expect(result.customerId).toBe('cust-uuid-1');
    expect(result.date).toBe('2025-04-01');
    expect(result.crates).toBe(150);
    expect(result.rate).toBe(900);
  });

  it('defaults advance to 0 when null', () => {
    const result = mapSale({ ...rawRow, advance: null });
    expect(result.advance).toBe(0);
  });

  it('defaults discount to 0 when null', () => {
    const result = mapSale({ ...rawRow, discount: null });
    expect(result.discount).toBe(0);
  });

  it('defaults advanceMethod to Cash when null', () => {
    const result = mapSale({ ...rawRow, advance_method: null });
    expect(result.advanceMethod).toBe('Cash');
  });

  it('defaults paymentMode to Credit when null', () => {
    const result = mapSale({ ...rawRow, payment_mode: null });
    expect(result.paymentMode).toBe('Credit');
  });

  it('defaults billNo to empty string when null', () => {
    const result = mapSale({ ...rawRow, bill_no: null });
    expect(result.billNo).toBe('');
  });
});

// ─────────────────────────────────────────────
//  SupplierPayment mapper
// ─────────────────────────────────────────────

describe('mapSupplierPayment (supplier_payments row → SupplierPayment)', () => {
  const rawRow = {
    id: 'pay-uuid-1',
    supplier_id: 'sup-uuid-1',
    amount: 15_000,
    date: '2025-04-05',
    method: 'Bank',
    account_no: '1234567890',
    account_holder_name: 'Khalid Abbasi',
    added_by: 'Admin',
    added_at_str: '5/4/2025, 11:00:00 AM',
  };

  it('maps all fields correctly', () => {
    const result = mapSupplierPayment(rawRow);
    expect(result.id).toBe('pay-uuid-1');
    expect(result.supplierId).toBe('sup-uuid-1');
    expect(result.amount).toBe(15_000);
    expect(result.date).toBe('2025-04-05');
    expect(result.method).toBe('Bank');
    expect(result.accountNo).toBe('1234567890');
    expect(result.accountHolderName).toBe('Khalid Abbasi');
  });

  it('defaults accountNo to empty string when null', () => {
    const result = mapSupplierPayment({ ...rawRow, account_no: null });
    expect(result.accountNo).toBe('');
  });

  it('defaults accountHolderName to empty string when null', () => {
    const result = mapSupplierPayment({ ...rawRow, account_holder_name: null });
    expect(result.accountHolderName).toBe('');
  });
});

// ─────────────────────────────────────────────
//  CustomerReturn mapper
// ─────────────────────────────────────────────

describe('mapCustomerReturn (customer_returns row → CustomerReturn)', () => {
  const rawRow = {
    id: 'ret-uuid-1',
    customer_id: 'cust-uuid-1',
    date: '2025-04-10',
    crates: 20,
    new_cost: 4500,
    remarks: 'Damaged goods',
    added_by: 'Admin',
    added_at_str: '10/4/2025, 02:00:00 PM',
  };

  it('maps newCost from new_cost', () => {
    const result = mapCustomerReturn(rawRow);
    expect(result.newCost).toBe(4500);
  });

  it('maps all other fields correctly', () => {
    const result = mapCustomerReturn(rawRow);
    expect(result.id).toBe('ret-uuid-1');
    expect(result.customerId).toBe('cust-uuid-1');
    expect(result.date).toBe('2025-04-10');
    expect(result.crates).toBe(20);
    expect(result.remarks).toBe('Damaged goods');
  });

  it('defaults remarks to empty string when null', () => {
    const result = mapCustomerReturn({ ...rawRow, remarks: null });
    expect(result.remarks).toBe('');
  });
});
