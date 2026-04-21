/**
 * Unit tests for all calculation helpers exported from src/store/index.ts
 *
 * Covers:
 *  - Supplier helpers: calcTruckTotal, calcSupplierTotalBill, calcSupplierTotalAdvance,
 *    calcSupplierTotalCarriage, calcSupplierTotalPayments, calcSupplierGrossTotal,
 *    calcSupplierTotalReceived, calcSupplierTotalTruckFare, calcSupplierTotalLabour,
 *    calcSupplierTotalBardana, calcSupplierBalance
 *  - Customer helpers: calcSaleTotal, calcSaleCommission, calcSaleCashWari, calcSaleNet,
 *    calcSaleNetAfterDiscount, calcCustomerTotalBill, calcCustomerTotalPayments,
 *    calcCustomerTotalAdvance, calcCustomerTotalReturns, calcCustomerTotalDiscount,
 *    calcCustomerBalance
 */

import { describe, it, expect } from 'vitest';
import {
  calcTruckTotal,
  calcSupplierTotalBill,
  calcSupplierTotalAdvance,
  calcSupplierTotalCarriage,
  calcSupplierTotalPayments,
  calcSupplierGrossTotal,
  calcSupplierTotalReceived,
  calcSupplierTotalTruckFare,
  calcSupplierTotalLabour,
  calcSupplierTotalBardana,
  calcSupplierBalance,
  calcSaleTotal,
  calcSaleCommission,
  calcSaleCashWari,
  calcSaleNet,
  calcSaleNetAfterDiscount,
  calcCustomerTotalBill,
  calcCustomerTotalPayments,
  calcCustomerTotalAdvance,
  calcCustomerTotalReturns,
  calcCustomerTotalDiscount,
  calcCustomerBalance,
  CUSTOMER_COMMISSION_DIVISOR,
  CASH_WARI_CUSTOMER,
  type Supplier,
  type Customer,
  type TruckRecord,
  type CustomerSale,
} from '../store/index';

// ─────────────────────────────────────────────
//  Helpers / Factories
// ─────────────────────────────────────────────

function makeTruck(overrides: Partial<TruckRecord> = {}): TruckRecord {
  return {
    id: 't1',
    supplierId: 's1',
    truckNo: 'ABC-123',
    loadingDate: '2025-01-01',
    builtyNo: 'B001',
    carriage: 0,
    truckFare: 0,
    labourCharges: 0,
    saleDate: '2025-01-02',
    advance: 0,
    advanceDate: '',
    bardana: 0,
    bardanaDate: '',
    parties: [],
    paymentMode: 'Cash',
    ...overrides,
  };
}

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 's1',
    supplierCode: 'S0001',
    name: 'Test Supplier',
    city: 'Rawalpindi',
    status: 'active',
    trucks: [],
    payments: [],
    ...overrides,
  };
}

function makeSale(overrides: Partial<CustomerSale> = {}): CustomerSale {
  return {
    id: 'sale1',
    customerId: 'c1',
    date: '2025-01-01',
    crates: 0,
    rate: 0,
    billNo: 'B001',
    advance: 0,
    advanceMethod: 'Cash',
    discount: 0,
    paymentMode: 'Cash',
    ...overrides,
  };
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c1',
    name: 'Test Customer',
    phone: '0300-0000000',
    nickname: 'TC',
    sales: [],
    payments: [],
    returns: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────
//  calcTruckTotal
// ─────────────────────────────────────────────

describe('calcTruckTotal', () => {
  it('returns 0 when truck has no parties', () => {
    const truck = makeTruck({ parties: [] });
    expect(calcTruckTotal(truck)).toBe(0);
  });

  it('sums crates × rate for a single party', () => {
    const truck = makeTruck({
      parties: [{ id: 'p1', personName: 'Ali', crates: 100, rate: 500 }],
    });
    expect(calcTruckTotal(truck)).toBe(50_000);
  });

  it('sums crates × rate across multiple parties', () => {
    const truck = makeTruck({
      parties: [
        { id: 'p1', personName: 'Ali', crates: 100, rate: 500 },
        { id: 'p2', personName: 'Babar', crates: 50, rate: 600 },
      ],
    });
    // 100*500 + 50*600 = 50000 + 30000 = 80000
    expect(calcTruckTotal(truck)).toBe(80_000);
  });
});

// ─────────────────────────────────────────────
//  Supplier aggregate helpers
// ─────────────────────────────────────────────

describe('calcSupplierTotalBill', () => {
  it('returns 0 for supplier with no trucks', () => {
    expect(calcSupplierTotalBill(makeSupplier())).toBe(0);
  });

  it('sums truck totals across all trucks', () => {
    const supplier = makeSupplier({
      trucks: [
        makeTruck({ parties: [{ id: 'p1', personName: 'A', crates: 100, rate: 500 }] }),
        makeTruck({ id: 't2', parties: [{ id: 'p2', personName: 'B', crates: 200, rate: 300 }] }),
      ],
    });
    // 50000 + 60000 = 110000
    expect(calcSupplierTotalBill(supplier)).toBe(110_000);
  });
});

describe('calcSupplierTotalAdvance', () => {
  it('returns 0 when no trucks', () => {
    expect(calcSupplierTotalAdvance(makeSupplier())).toBe(0);
  });

  it('sums advance from all trucks', () => {
    const supplier = makeSupplier({
      trucks: [makeTruck({ advance: 5000 }), makeTruck({ id: 't2', advance: 3000 })],
    });
    expect(calcSupplierTotalAdvance(supplier)).toBe(8000);
  });
});

describe('calcSupplierTotalCarriage', () => {
  it('returns 0 when no trucks', () => {
    expect(calcSupplierTotalCarriage(makeSupplier())).toBe(0);
  });

  it('sums carriage from all trucks', () => {
    const supplier = makeSupplier({
      trucks: [makeTruck({ carriage: 1000 }), makeTruck({ id: 't2', carriage: 2000 })],
    });
    expect(calcSupplierTotalCarriage(supplier)).toBe(3000);
  });
});

describe('calcSupplierTotalPayments', () => {
  it('returns 0 when no payments', () => {
    expect(calcSupplierTotalPayments(makeSupplier())).toBe(0);
  });

  it('sums all payment amounts', () => {
    const supplier = makeSupplier({
      payments: [
        { id: 'pay1', supplierId: 's1', amount: 10_000, date: '2025-01-01', method: 'Cash' },
        { id: 'pay2', supplierId: 's1', amount: 5_000, date: '2025-01-02', method: 'Bank' },
      ],
    });
    expect(calcSupplierTotalPayments(supplier)).toBe(15_000);
  });
});

describe('calcSupplierGrossTotal', () => {
  it('equals calcSupplierTotalBill (same logic)', () => {
    const supplier = makeSupplier({
      trucks: [makeTruck({ parties: [{ id: 'p1', personName: 'A', crates: 100, rate: 500 }] })],
    });
    expect(calcSupplierGrossTotal(supplier)).toBe(calcSupplierTotalBill(supplier));
  });
});

describe('calcSupplierTotalReceived', () => {
  it('equals advance + payments', () => {
    const supplier = makeSupplier({
      trucks: [makeTruck({ advance: 5000 })],
      payments: [{ id: 'pay1', supplierId: 's1', amount: 10_000, date: '2025-01-01', method: 'Cash' }],
    });
    expect(calcSupplierTotalReceived(supplier)).toBe(15_000);
  });
});

describe('calcSupplierTotalTruckFare', () => {
  it('sums truckFare from all trucks', () => {
    const supplier = makeSupplier({
      trucks: [makeTruck({ truckFare: 2000 }), makeTruck({ id: 't2', truckFare: 3000 })],
    });
    expect(calcSupplierTotalTruckFare(supplier)).toBe(5000);
  });
});

describe('calcSupplierTotalLabour', () => {
  it('sums labourCharges from all trucks', () => {
    const supplier = makeSupplier({
      trucks: [makeTruck({ labourCharges: 1000 }), makeTruck({ id: 't2', labourCharges: 500 })],
    });
    expect(calcSupplierTotalLabour(supplier)).toBe(1500);
  });
});

describe('calcSupplierTotalBardana', () => {
  it('sums bardana from all trucks', () => {
    const supplier = makeSupplier({
      trucks: [makeTruck({ bardana: 800 }), makeTruck({ id: 't2', bardana: 200 })],
    });
    expect(calcSupplierTotalBardana(supplier)).toBe(1000);
  });
});

// ─────────────────────────────────────────────
//  calcSupplierBalance — core financial logic
// ─────────────────────────────────────────────

describe('calcSupplierBalance', () => {
  it('returns 0 for supplier with no trucks and no payments', () => {
    expect(calcSupplierBalance(makeSupplier())).toBe(0);
  });

  it('returns grossTotal when there are no deductions', () => {
    const supplier = makeSupplier({
      trucks: [makeTruck({ parties: [{ id: 'p1', personName: 'A', crates: 100, rate: 500 }] })],
    });
    // grossTotal = 50000, all deductions = 0
    expect(calcSupplierBalance(supplier)).toBe(50_000);
  });

  it('deducts carriage, truckFare, labour, advance, bardana, and payments', () => {
    const supplier = makeSupplier({
      trucks: [
        makeTruck({
          parties: [{ id: 'p1', personName: 'A', crates: 100, rate: 1000 }],
          carriage: 1000,
          truckFare: 2000,
          labourCharges: 500,
          advance: 3000,
          bardana: 400,
        }),
      ],
      payments: [
        { id: 'pay1', supplierId: 's1', amount: 5000, date: '2025-01-01', method: 'Cash' },
      ],
    });
    // grossTotal = 100 * 1000 = 100000
    // deductions = 1000 + 2000 + 500 + 3000 + 400 + 5000 = 11900
    // balance = 100000 - 11900 = 88100
    expect(calcSupplierBalance(supplier)).toBe(88_100);
  });

  it('satisfies the invariant: balance = grossTotal - carriage - truckFare - labour - advance - bardana - payments', () => {
    const supplier = makeSupplier({
      trucks: [
        makeTruck({
          parties: [{ id: 'p1', personName: 'A', crates: 200, rate: 800 }],
          carriage: 2000,
          truckFare: 1500,
          labourCharges: 1000,
          advance: 5000,
          bardana: 600,
        }),
        makeTruck({
          id: 't2',
          parties: [{ id: 'p2', personName: 'B', crates: 100, rate: 600 }],
          carriage: 1000,
          truckFare: 800,
          labourCharges: 500,
          advance: 2000,
          bardana: 300,
        }),
      ],
      payments: [
        { id: 'pay1', supplierId: 's1', amount: 10_000, date: '2025-01-01', method: 'Cash' },
        { id: 'pay2', supplierId: 's1', amount: 5_000, date: '2025-01-02', method: 'Bank' },
      ],
    });

    const expected =
      calcSupplierGrossTotal(supplier)
      - calcSupplierTotalCarriage(supplier)
      - calcSupplierTotalTruckFare(supplier)
      - calcSupplierTotalLabour(supplier)
      - calcSupplierTotalAdvance(supplier)
      - calcSupplierTotalBardana(supplier)
      - calcSupplierTotalPayments(supplier);

    expect(calcSupplierBalance(supplier)).toBe(expected);
  });

  it('can produce a negative balance when deductions exceed gross total', () => {
    const supplier = makeSupplier({
      trucks: [makeTruck({ parties: [{ id: 'p1', personName: 'A', crates: 10, rate: 100 }], advance: 5000 })],
    });
    // grossTotal = 1000, advance = 5000 → balance = -4000
    expect(calcSupplierBalance(supplier)).toBe(-4000);
  });
});

// ─────────────────────────────────────────────
//  Sale helpers
// ─────────────────────────────────────────────

describe('calcSaleTotal', () => {
  it('returns crates × rate', () => {
    expect(calcSaleTotal(makeSale({ crates: 100, rate: 500 }))).toBe(50_000);
  });

  it('returns 0 when crates or rate is 0', () => {
    expect(calcSaleTotal(makeSale({ crates: 0, rate: 500 }))).toBe(0);
    expect(calcSaleTotal(makeSale({ crates: 100, rate: 0 }))).toBe(0);
  });
});

describe('calcSaleCommission', () => {
  it('returns Math.round(totalValue / CUSTOMER_COMMISSION_DIVISOR)', () => {
    const sale = makeSale({ crates: 100, rate: 1000 });
    // totalValue = 100000, commission = Math.round(100000 / 13.78) = 7257
    expect(calcSaleCommission(sale)).toBe(Math.round(100_000 / CUSTOMER_COMMISSION_DIVISOR));
    expect(calcSaleCommission(sale)).toBe(7257);
  });

  it('returns 0 for a zero-value sale', () => {
    expect(calcSaleCommission(makeSale({ crates: 0, rate: 0 }))).toBe(0);
  });
});

describe('calcSaleCashWari', () => {
  it('uses the provided wariRate when set', () => {
    const sale = makeSale({ crates: 50, wariRate: 5 });
    expect(calcSaleCashWari(sale)).toBe(250);
  });

  it('falls back to CASH_WARI_CUSTOMER constant when wariRate is undefined', () => {
    const sale = makeSale({ crates: 50, wariRate: undefined });
    expect(calcSaleCashWari(sale)).toBe(50 * CASH_WARI_CUSTOMER);
  });

  it('returns 0 when crates is 0', () => {
    expect(calcSaleCashWari(makeSale({ crates: 0, wariRate: 5 }))).toBe(0);
  });
});

describe('calcSaleNet', () => {
  it('equals saleTotal + commission + cashWari', () => {
    const sale = makeSale({ crates: 100, rate: 1000, wariRate: 5 });
    const expected = calcSaleTotal(sale) + calcSaleCommission(sale) + calcSaleCashWari(sale);
    expect(calcSaleNet(sale)).toBe(expected);
  });
});

describe('calcSaleNetAfterDiscount', () => {
  it('deducts discount from net', () => {
    const sale = makeSale({ crates: 100, rate: 1000, wariRate: 5, discount: 500 });
    expect(calcSaleNetAfterDiscount(sale)).toBe(calcSaleNet(sale) - 500);
  });

  it('returns calcSaleNet when discount is 0', () => {
    const sale = makeSale({ crates: 100, rate: 1000, wariRate: 5, discount: 0 });
    expect(calcSaleNetAfterDiscount(sale)).toBe(calcSaleNet(sale));
  });
});

// ─────────────────────────────────────────────
//  Customer aggregate helpers
// ─────────────────────────────────────────────

describe('calcCustomerTotalBill', () => {
  it('returns 0 for customer with no sales and no returns', () => {
    expect(calcCustomerTotalBill(makeCustomer())).toBe(0);
  });

  it('sums netAfterDiscount for all sales minus returns newCost', () => {
    const sale1 = makeSale({ crates: 100, rate: 1000, wariRate: 5, discount: 0 });
    const sale2 = makeSale({ id: 'sale2', crates: 50, rate: 800, wariRate: 5, discount: 200 });
    const customer = makeCustomer({
      sales: [sale1, sale2],
      returns: [{ id: 'r1', customerId: 'c1', date: '2025-01-01', crates: 10, newCost: 3000, remarks: '' }],
    });
    const expected =
      calcSaleNetAfterDiscount(sale1) + calcSaleNetAfterDiscount(sale2) - 3000;
    expect(calcCustomerTotalBill(customer)).toBe(expected);
  });
});

describe('calcCustomerTotalPayments', () => {
  it('returns 0 when no payments', () => {
    expect(calcCustomerTotalPayments(makeCustomer())).toBe(0);
  });

  it('sums all payment amounts', () => {
    const customer = makeCustomer({
      payments: [
        { id: 'p1', customerId: 'c1', amount: 5000, date: '2025-01-01', method: 'Cash' },
        { id: 'p2', customerId: 'c1', amount: 3000, date: '2025-01-02', method: 'Bank' },
      ],
    });
    expect(calcCustomerTotalPayments(customer)).toBe(8000);
  });
});

describe('calcCustomerTotalAdvance', () => {
  it('sums advance from all sales', () => {
    const customer = makeCustomer({
      sales: [
        makeSale({ advance: 2000 }),
        makeSale({ id: 'sale2', advance: 1000 }),
      ],
    });
    expect(calcCustomerTotalAdvance(customer)).toBe(3000);
  });
});

describe('calcCustomerTotalReturns', () => {
  it('sums newCost from all returns', () => {
    const customer = makeCustomer({
      returns: [
        { id: 'r1', customerId: 'c1', date: '2025-01-01', crates: 10, newCost: 2000, remarks: '' },
        { id: 'r2', customerId: 'c1', date: '2025-01-02', crates: 5, newCost: 1000, remarks: '' },
      ],
    });
    expect(calcCustomerTotalReturns(customer)).toBe(3000);
  });
});

describe('calcCustomerTotalDiscount', () => {
  it('sums discount from all sales', () => {
    const customer = makeCustomer({
      sales: [
        makeSale({ discount: 500 }),
        makeSale({ id: 'sale2', discount: 300 }),
      ],
    });
    expect(calcCustomerTotalDiscount(customer)).toBe(800);
  });
});

// ─────────────────────────────────────────────
//  calcCustomerBalance — core financial logic
// ─────────────────────────────────────────────

describe('calcCustomerBalance', () => {
  it('returns 0 for customer with no sales, payments, or returns', () => {
    expect(calcCustomerBalance(makeCustomer())).toBe(0);
  });

  it('equals totalBill - totalPayments - totalAdvance', () => {
    const sale = makeSale({ crates: 100, rate: 1000, wariRate: 5, advance: 2000 });
    const customer = makeCustomer({
      sales: [sale],
      payments: [{ id: 'p1', customerId: 'c1', amount: 5000, date: '2025-01-01', method: 'Cash' }],
      returns: [],
    });
    const expected =
      calcCustomerTotalBill(customer)
      - calcCustomerTotalPayments(customer)
      - calcCustomerTotalAdvance(customer);
    expect(calcCustomerBalance(customer)).toBe(expected);
  });

  it('satisfies the invariant for complex data', () => {
    const sale1 = makeSale({ crates: 200, rate: 800, wariRate: 5, advance: 3000, discount: 500 });
    const sale2 = makeSale({ id: 'sale2', crates: 100, rate: 600, wariRate: 5, advance: 1000, discount: 0 });
    const customer = makeCustomer({
      sales: [sale1, sale2],
      payments: [
        { id: 'p1', customerId: 'c1', amount: 10_000, date: '2025-01-01', method: 'Cash' },
        { id: 'p2', customerId: 'c1', amount: 5_000, date: '2025-01-02', method: 'Bank' },
      ],
      returns: [
        { id: 'r1', customerId: 'c1', date: '2025-01-03', crates: 20, newCost: 4000, remarks: '' },
      ],
    });

    const expected =
      calcCustomerTotalBill(customer)
      - calcCustomerTotalPayments(customer)
      - calcCustomerTotalAdvance(customer);

    expect(calcCustomerBalance(customer)).toBe(expected);
  });

  it('can produce a negative balance when payments exceed bill', () => {
    const customer = makeCustomer({
      sales: [makeSale({ crates: 10, rate: 100, wariRate: 5 })],
      payments: [{ id: 'p1', customerId: 'c1', amount: 50_000, date: '2025-01-01', method: 'Cash' }],
    });
    expect(calcCustomerBalance(customer)).toBeLessThan(0);
  });
});
