# Supplier Module Fields Update

## Complete Field Sequence (29 Fields)

All fields are now implemented in the exact sequence requested:

### 1-2. Basic Information
1. **بیوپاری نام / Trader Name** - `name`
2. **شہر / City** - `city`

### 3-9. Truck Data
3. **فون نمبر / Phone Number** - `phone` (NEW)
4. **بلٹی نمبر / Bilty Number** - `builtyNo`
5. **گاڑی نمبر / Vehicle Number** - `truckNo`
6. **لوڈنگ تاریخ / Loading Date** - `loadingDate`
7. **ٹرک کرایہ / Truck Fare** - `truckFare` (NEW)
8. **مزدوری (فی کریٹ 10 روپے) / Labour Charges (Rs. 10 per Crate)** - `labourRate` (NEW - per crate, total calculated)
9. **لاگا / کیرج (فی کریٹ 10 روپے) / Laga / Carriage (Rs. 10 per Crate)** - `carriageRate` (NEW - per crate, total calculated)

### 10-13. Goods Owners (Multiple)
10. **Owner Name** - `parties[].personName`
11. **ٹوٹل کریٹ / Total Crates** - `parties[].crates`
12. **فی کریٹ اوسط قیمت / Average Price per Crate** - Calculated: `totalValue / crates`
13. **کل رقم / Total Amount** - `parties[].totalValue`

### 14. Sale Information
14. **تاریخ سیل / Sale Date** - `saleDate`

### 15-18. Advance & Bardana
15. **بیانہ / ایڈوانس / Advance Payment** - `advance`
16. **تاریخ بیانہ / Advance Date** - `advanceDate` (NEW)
17. **باردانہ / ایڈوانس / Bardana / Advance** - `bardana` (NEW)
18. **تاریخ باردانہ / Bardana Date** - `bardanaDate` (NEW)

### 19-26. Payment Details (Multiple)
19. **ادائیگی / Payment** - `entryPayments[].amount`
20. **تاریخ ادائیگی / Payment Date** - `entryPayments[].date`
21. **صورت ادائیگی / Payment Method** - `entryPayments[].method`
22. **صورت ادائیگی / Payment Method** - `paymentMode` (Cash/Credit for truck)
23. **کیش / Cash** - Option in payment method
24. **آن لائن / Online** - Option in payment method (NEW)
25. **ادائیگی اکاؤنٹ نمبر / Payment Account Number** - `entryPayments[].accountNo` (NEW)
26. **اکاؤنٹ ہولڈر نام / Account Holder Name** - `entryPayments[].accountHolderName` (NEW)

### 27-29. Summary (Auto-calculated)
27. **کل رقم / Grand Total Amount** - `grandTotal` (Calculated)
28. **کل ادائیگی / Total Paid** - `totalPaid` (Calculated: advance + bardana + payments)
29. **بقایا / Balance** - `balance` (Calculated)

## Database Changes Required

Run the `database-migration.sql` file in your Supabase SQL Editor to add:

### truck_records table:
- `truck_fare` (NUMERIC)
- `labour_charges` (NUMERIC)
- `advance_date` (TEXT)
- `bardana` (NUMERIC)
- `bardana_date` (TEXT)

### supplier_payments table:
- `account_no` (TEXT)
- `account_holder_name` (TEXT)

## Code Changes Made

### 1. Store (src/store/index.ts)
- Updated `TruckRecord` interface with new fields
- Updated `SupplierPayment` interface with account fields
- Added 'Online' to payment method types
- Updated mapper functions (`mapTruck`, `truckToRow`, `mapSupplierPayment`, `supplierPaymentToRow`)
- Updated `updateTruck` and `updateSupplierPayment` functions

### 2. Supplier Module (src/pages/SupplierModule.tsx)
- Updated `newEntry` state with all new fields
- Updated `entryPayments` state with account fields
- Modified `handleAddEntry` to calculate labour and carriage totals from per-crate rates
- Updated all edit functions to load/save new fields
- Added comprehensive live calculations
- Updated form UI with all 29 fields in correct sequence
- Added payment entries section with account details for Online/Bank payments

## Features Preserved
- All existing functionality maintained
- Multiple goods owners support
- Multiple payment entries support
- Edit/Delete operations
- Print/Export functionality
- Live calculations and summaries

## New Features
- Per-crate labour and carriage rates with automatic total calculation
- Separate truck fare field
- Bardana advance with date tracking
- Advance date tracking
- Online payment support with account details
- Enhanced summary showing all deductions and balances
