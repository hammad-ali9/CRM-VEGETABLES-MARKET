/**
 * Unit tests for src/utils/printUtils.ts
 *
 * Covers isWithinPrintPeriod and getPeriodLabel for all supported periods.
 */

import { describe, it, expect } from 'vitest';
import { isWithinPrintPeriod, getPeriodLabel } from '../utils/printUtils';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD in local time */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns yesterday's date as YYYY-MM-DD */
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Returns a date within the current calendar week (today itself) */
function thisWeekStr(): string {
  return todayStr();
}

/** Returns a date within the current calendar month (today itself) */
function thisMonthStr(): string {
  return todayStr();
}

/** Returns a date from last month */
function lastMonthStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────
//  isWithinPrintPeriod — 'daily'
// ─────────────────────────────────────────────

describe("isWithinPrintPeriod — 'daily'", () => {
  it("returns true for today's date", () => {
    expect(isWithinPrintPeriod(todayStr(), 'daily')).toBe(true);
  });

  it("returns false for yesterday's date", () => {
    expect(isWithinPrintPeriod(yesterdayStr(), 'daily')).toBe(false);
  });

  it('returns false for null date', () => {
    expect(isWithinPrintPeriod(null, 'daily')).toBe(false);
  });

  it('returns false for undefined date', () => {
    expect(isWithinPrintPeriod(undefined, 'daily')).toBe(false);
  });
});

// ─────────────────────────────────────────────
//  isWithinPrintPeriod — 'weekly'
// ─────────────────────────────────────────────

describe("isWithinPrintPeriod — 'weekly'", () => {
  it('returns true for a date within the current calendar week (today)', () => {
    expect(isWithinPrintPeriod(thisWeekStr(), 'weekly')).toBe(true);
  });

  it('returns false for a date from last month', () => {
    expect(isWithinPrintPeriod(lastMonthStr(), 'weekly')).toBe(false);
  });

  it('returns false for null date', () => {
    expect(isWithinPrintPeriod(null, 'weekly')).toBe(false);
  });
});

// ─────────────────────────────────────────────
//  isWithinPrintPeriod — 'monthly'
// ─────────────────────────────────────────────

describe("isWithinPrintPeriod — 'monthly'", () => {
  it('returns true for a date within the current calendar month (today)', () => {
    expect(isWithinPrintPeriod(thisMonthStr(), 'monthly')).toBe(true);
  });

  it('returns false for a date from last month', () => {
    expect(isWithinPrintPeriod(lastMonthStr(), 'monthly')).toBe(false);
  });

  it('returns false for null date', () => {
    expect(isWithinPrintPeriod(null, 'monthly')).toBe(false);
  });
});

// ─────────────────────────────────────────────
//  isWithinPrintPeriod — 'all'
// ─────────────────────────────────────────────

describe("isWithinPrintPeriod — 'all'", () => {
  it('returns true for any non-null date string', () => {
    expect(isWithinPrintPeriod('2020-01-01', 'all')).toBe(true);
    expect(isWithinPrintPeriod('1999-12-31', 'all')).toBe(true);
    expect(isWithinPrintPeriod(todayStr(), 'all')).toBe(true);
  });

  it('returns true for null date (special case for all)', () => {
    expect(isWithinPrintPeriod(null, 'all')).toBe(true);
  });

  it('returns true for undefined date', () => {
    expect(isWithinPrintPeriod(undefined, 'all')).toBe(true);
  });
});

// ─────────────────────────────────────────────
//  getPeriodLabel
// ─────────────────────────────────────────────

describe('getPeriodLabel', () => {
  it("returns 'کل وقت' for period 'all'", () => {
    expect(getPeriodLabel('all')).toBe('کل وقت');
  });

  it("returns a string containing the current year for period 'monthly'", () => {
    const label = getPeriodLabel('monthly');
    const currentYear = new Date().getFullYear().toString();
    expect(label).toContain(currentYear);
  });

  it("returns a string containing today's date for period 'daily'", () => {
    const label = getPeriodLabel('daily');
    // The label format is "یومیہ — YYYY-MM-DD"
    const today = new Date().toLocaleDateString('en-CA');
    expect(label).toContain(today);
  });

  it("returns a string containing today's date for period 'weekly'", () => {
    const label = getPeriodLabel('weekly');
    const today = new Date().toLocaleDateString('en-CA');
    expect(label).toContain(today);
  });
});
