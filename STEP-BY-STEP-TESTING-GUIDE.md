# 📖 Step-by-Step Testing Guide

**Purpose**: Detailed instructions for testing all functionality  
**Duration**: ~2-3 hours for complete testing  

---

## ⚠️ CRITICAL: Pre-Test Setup

### Step 0: Database Migration (MUST DO FIRST)
```
1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy entire contents of: database-migration.sql
4. Paste into SQL Editor
5. Click "Run" button
6. Wait for "Success" message
7. Verify no errors in output
```

**Verify Migration Success**:
- [ ] No error messages
- [ ] All columns added
- [ ] Default values set

---

## 🧪 SUPPLIER MODULE TESTING

### Phase 1: Create & Verify

#### Test 1.1: Create Supplier Entry
**Time**: 10 minutes

**Step-by-Step**:
1. Open application
2. Navigate to "Supplier Management"
3. Click blue "+ New Entry" button
4. Fill form with these EXACT values:

```
SUPPLIER PROFILE:
  Trader Name: "Test Supplier 1"
  City: "Karachi"
  Phone Number: "03001234567"

TRUCK DETAILS:
  Bilty Number: "BL-2024-001"
  Vehicle Number: "KHI-001"
  Loading Date: [Today's date]

COSTS:
  Truck Fare: 500
  Labour Rate: 10
  Carriage Rate: 10

OWNER/PARTY:
  Owner Name: "Ali Ahmed"
  Crates: 100
  Total Value: 50000

SALE & ADVANCES:
  Sale Date: [Today's date]
  Advance: 5000
  Advance Date: [Today's date]
  Bardana: 2000
  Bardana Date: [Today's date]

RATES:
  Commission %: 13.6
  Wari Rate: 10

PAYMENT:
  Amount: 10000
  Date: [Today's date]
  Method: Cash
```

5. Click "Save Entry" button
6. Wait for success message

**Verify**:
- [ ] No error message appears
- [ ] Supplier appears in list
- [ ] Supplier name shows "Test Supplier 1"
- [ ] City shows "Karachi"

---

#### Test 1.2: Verify Calculations
**Time**: 5 minutes

**Step-by-Step**:
1. Click on "Test Supplier 1" in list
2. View detail page
3. Check summary panel on right side

**Expected Values** (verify each):
```
Total Crates: 100
Gross Total: Rs. 50,000
Net Bill (after comm & wari): Rs. 42,200

Deductions:
  Carriage (کیریج): -Rs. 1,000
  Truck Fare (ٹرک کرایہ): -Rs. 500
  Labour (مزدوری): -Rs. 1,000
  Advance (بیانہ): -Rs. 5,000
  Bardana (باردانہ): -Rs. 2,000
  Payments (ادائیگیاں): -Rs. 10,000

Balance (بقایہ): Rs. 22,700
```

**Calculation Breakdown**:
```
Gross = 100 crates × Rs. 500/crate = Rs. 50,000 ✓
Commission = Rs. 50,000 × 13.6% = Rs. 6,800 ✓
Wari = 100 crates × Rs. 10/crate = Rs. 1,000 ✓
Net Bill = Rs. 50,000 - Rs. 6,800 - Rs. 1,000 = Rs. 42,200 ✓
Labour = 100 crates × Rs. 10/crate = Rs. 1,000 ✓
Carriage = 100 crates × Rs. 10/crate = Rs. 1,000 ✓
Balance = Rs. 42,200 - Rs. 1,000 - Rs. 500 - Rs. 1,000 - Rs. 5,000 - Rs. 2,000 - Rs. 10,000 = Rs. 22,700 ✓
```

**Verify**:
- [ ] All values match expected
- [ ] All deductions visible
- [ ] Balance calculation correct

---

### Phase 2: Edit & Verify

#### Test 2.1: Edit Supplier Profile
**Time**: 5 minutes

**Step-by-Step**:
1. In detail view, find "Edit" button on supplier card
2. Click "Edit" button
3. Change these fields:
   - Trader Name: "Test Supplier 1 (Updated)"
   - Phone Number: "03009876543"
4. Click "Save Entry"
5. Wait for success message
6. Refresh page (Press F5)

**Verify**:
- [ ] Changes save without error
- [ ] Updated name shows in list
- [ ] Updated phone shows in detail view
- [ ] Changes persist after refresh

**Database Check**:
- Open Supabase → suppliers table
- Find row with name "Test Supplier 1 (Updated)"
- Verify phone = "03009876543"

---

#### Test 2.2: Edit Truck Details & Rates
**Time**: 10 minutes

**Step-by-Step**:
1. In detail view, find truck record
2. Click "Edit" button on truck
3. Change these fields:
   - Truck Fare: 750 (was 500)
   - Labour Rate: 12 (was 10)
   - Carriage Rate: 12 (was 10)
   - Commission %: 15 (was 13.6)
   - Wari Rate: 12 (was 10)
4. Click "Save Entry"
5. Wait for calculations to update

**Verify Calculations Update**:
```
NEW VALUES:
Labour = 100 × 12 = Rs. 1,200 (was Rs. 1,000)
Carriage = 100 × 12 = Rs. 1,200 (was Rs. 1,000)
Commission = Rs. 50,000 × 15% = Rs. 7,500 (was Rs. 6,800)
Wari = 100 × 12 = Rs. 1,200 (was Rs. 1,000)
Net Bill = Rs. 50,000 - Rs. 7,500 - Rs. 1,200 = Rs. 41,300 (was Rs. 42,200)
Balance = Rs. 41,300 - Rs. 1,200 - Rs. 750 - Rs. 1,200 - Rs. 5,000 - Rs. 2,000 - Rs. 10,000 = Rs. 21,150
```

**Verify**:
- [ ] Labour shows Rs. 1,200
- [ ] Carriage shows Rs. 1,200
- [ ] Commission shows Rs. 7,500
- [ ] Wari shows Rs. 1,200
- [ ] Net Bill shows Rs. 41,300
- [ ] Balance shows Rs. 21,150

**Database Check**:
- Open Supabase → truck_records table
- Find truck with bilty_no = "BL-2024-001"
- Verify:
  - truck_fare = 750
  - labour_charges = 1200
  - carriage = 1200
  - comm_percent = 15
  - wari_rate = 12

---

#### Test 2.3: Edit Payment
**Time**: 5 minutes

**Step-by-Step**:
1. In detail view, find payment record
2. Click "Edit" button on payment
3. Change these fields:
   - Amount: 15000 (was 10000)
   - Method: Online (was Cash)
   - Account Number: "1234567890"
   - Account Holder Name: "Ahmed Khan"
4. Click "Save Entry"

**Verify**:
- [ ] Payment amount shows Rs. 15,000
- [ ] Method shows "Online"
- [ ] Account number displays "1234567890"
- [ ] Account holder displays "Ahmed Khan"
- [ ] Balance updates to Rs. 16,150

**New Balance Calculation**:
```
Balance = Rs. 41,300 - (Rs. 1,200 + Rs. 750 + Rs. 1,200 + Rs. 5,000 + Rs. 2,000 + Rs. 15,000)
Balance = Rs. 41,300 - Rs. 25,150 = Rs. 16,150 ✓
```

**Database Check**:
- Open Supabase → supplier_payments table
- Find payment with amount = 15000
- Verify:
  - method = "Online"
  - account_no = "1234567890"
  - account_holder_name = "Ahmed Khan"

---

#### Test 2.4: Add Multiple Parties
**Time**: 5 minutes

**Step-by-Step**:
1. Click "Edit" on truck
2. Find "Add Another Owner" button
3. Click it
4. Fill in second owner:
   - Owner Name: "Hassan Ali"
   - Crates: 50
   - Total Value: 25000
5. Click "Save Entry"

**Verify Calculations Update**:
```
NEW VALUES:
Total Crates = 100 + 50 = 150
Labour = 150 × 12 = Rs. 1,800
Carriage = 150 × 12 = Rs. 1,800
Wari = 150 × 12 = Rs. 1,800
Gross Total = Rs. 50,000 + Rs. 25,000 = Rs. 75,000
Commission = Rs. 75,000 × 15% = Rs. 11,250
Net Bill = Rs. 75,000 - Rs. 11,250 - Rs. 1,800 = Rs. 61,950
Balance = Rs. 61,950 - (Rs. 1,800 + Rs. 750 + Rs. 1,800 + Rs. 5,000 + Rs. 2,000 + Rs. 15,000) = Rs. 35,600
```

**Verify**:
- [ ] Total Crates shows 150
- [ ] Gross Total shows Rs. 75,000
- [ ] Labour shows Rs. 1,800
- [ ] Carriage shows Rs. 1,800
- [ ] Balance shows Rs. 35,600

---

#### Test 2.5: Add Multiple Payments
**Time**: 5 minutes

**Step-by-Step**:
1. In detail view, click "New Payment" button
2. Fill in second payment:
   - Amount: 5000
   - Date: [Today's date]
   - Method: Cash
3. Click "Save Entry"

**Verify**:
- [ ] Second payment appears in list
- [ ] Total payments = Rs. 20,000
- [ ] Balance updates to Rs. 30,600

**New Balance**:
```
Balance = Rs. 61,950 - (Rs. 1,800 + Rs. 750 + Rs. 1,800 + Rs. 5,000 + Rs. 2,000 + Rs. 20,000) = Rs. 30,600 ✓
```

---

### Phase 3: Delete & Verify

#### Test 3.1: Delete Payment
**Time**: 3 minutes

**Step-by-Step**:
1. In detail view, find payment record
2. Click delete icon (trash can)
3. Confirm deletion
4. Verify payment removed

**Verify**:
- [ ] Payment removed from list
- [ ] Balance recalculates to Rs. 35,600

---

#### Test 3.2: Delete Truck
**Time**: 3 minutes

**Step-by-Step**:
1. In detail view, find truck record
2. Click delete icon
3. Confirm deletion
4. Verify truck removed

**Verify**:
- [ ] Truck removed from detail view
- [ ] Summary panel disappears

---

#### Test 3.3: Delete Supplier
**Time**: 3 minutes

**Step-by-Step**:
1. Go back to supplier list
2. Find "Test Supplier 1 (Updated)"
3. Click delete icon
4. Confirm deletion
5. Verify supplier removed

**Verify**:
- [ ] Supplier removed from list
- [ ] No error message

**Database Check**:
- Open Supabase → suppliers table
- Verify supplier not found
- Verify truck_records deleted (cascade)
- Verify supplier_payments deleted (cascade)

---

## 🧪 CUSTOMER MODULE TESTING

### Phase 1: Create & Verify

#### Test 4.1: Create Customer Entry
**Time**: 10 minutes

**Step-by-Step**:
1. Navigate to "Customer Management"
2. Click blue "+ New Entry" button
3. Fill form with these EXACT values:

```
CUSTOMER PROFILE:
  Buyer Name: "Test Customer 1"
  Address: "Gulshan, Karachi"
  Phone Number: "03101234567"

RATE SETTINGS:
  Commission %: 7.25
  Wari Rate: 5

PURCHASE DATA:
  Purchase Date: [Today's date]
  Number of Crates: 50
  Total Crate Price: 25000
  Bill Number: "BILL-2024-001"
  Cash Payment (Advance): 2000
  Discount: 500
  Credit: Credit

PAYMENT:
  Amount: 5000
  Date: [Today's date]
  Method: Cash
```

4. Click "Save Entry"

**Verify**:
- [ ] No error message
- [ ] Customer appears in list
- [ ] Customer name shows "Test Customer 1"

---

#### Test 4.2: Verify Calculations
**Time**: 5 minutes

**Step-by-Step**:
1. Click on "Test Customer 1" in list
2. View detail page
3. Check summary panel

**Expected Values**:
```
Total Crates: 50
Total Bill: Rs. 26,562.50

Deductions:
  Discount (رعایت): -Rs. 500
  Advance (بیانہ): -Rs. 2,000
  Payments (ادائیگیاں): -Rs. 5,000

Balance (بقایہ): Rs. 19,062.50
```

**Calculation Breakdown**:
```
Sale Total = 50 × (25000/50) = Rs. 25,000 ✓
Commission = Rs. 25,000 × 7.25% = Rs. 1,812.50 ✓
Wari = 50 × Rs. 5 = Rs. 250 ✓
Net Bill = Rs. 25,000 + Rs. 1,812.50 + Rs. 250 = Rs. 27,062.50 ✓
Net After Discount = Rs. 27,062.50 - Rs. 500 = Rs. 26,562.50 ✓
Balance = Rs. 26,562.50 - Rs. 5,000 - Rs. 2,000 = Rs. 19,562.50 ✓
```

**Verify**:
- [ ] All values match expected
- [ ] All deductions visible
- [ ] Balance calculation correct

---

### Phase 2: Edit & Verify

#### Test 5.1: Edit Customer Profile
**Time**: 5 minutes

**Step-by-Step**:
1. In detail view, click "Edit" button
2. Change:
   - Buyer Name: "Test Customer 1 (Updated)"
   - Address: "Gulshan-e-Iqbal, Karachi"
   - Phone: "03109876543"
3. Click "Save Entry"
4. Refresh page (F5)

**Verify**:
- [ ] Changes save without error
- [ ] Updated name shows in list
- [ ] Updated address shows in detail view
- [ ] Changes persist after refresh

---

#### Test 5.2: Edit Sale & Rates
**Time**: 10 minutes

**Step-by-Step**:
1. In detail view, click "Edit" on sale
2. Change:
   - Number of Crates: 75 (was 50)
   - Total Crate Price: 37500 (was 25000)
   - Commission %: 8 (was 7.25)
   - Wari Rate: 6 (was 5)
   - Discount: 1000 (was 500)
3. Click "Save Entry"

**Verify Calculations Update**:
```
NEW VALUES:
Sale Total = 75 × (37500/75) = Rs. 37,500
Commission = Rs. 37,500 × 8% = Rs. 3,000
Wari = 75 × Rs. 6 = Rs. 450
Net Bill = Rs. 37,500 + Rs. 3,000 + Rs. 450 = Rs. 40,950
Net After Discount = Rs. 40,950 - Rs. 1,000 = Rs. 39,950
Balance = Rs. 39,950 - Rs. 5,000 - Rs. 2,000 = Rs. 32,950
```

**Verify**:
- [ ] Commission shows Rs. 3,000
- [ ] Wari shows Rs. 450
- [ ] Net Bill shows Rs. 40,950
- [ ] Discount shows Rs. 1,000
- [ ] Balance shows Rs. 32,950

---

#### Test 5.3: Edit Payment
**Time**: 5 minutes

**Step-by-Step**:
1. In detail view, click "Edit" on payment
2. Change:
   - Amount: 8000 (was 5000)
   - Method: Online
   - Account Number: "9876543210"
   - Account Holder: "Test Customer 1"
3. Click "Save Entry"

**Verify**:
- [ ] Payment amount shows Rs. 8,000
- [ ] Method shows "Online"
- [ ] Account details display
- [ ] Balance updates to Rs. 29,950

**New Balance**:
```
Balance = Rs. 39,950 - Rs. 8,000 - Rs. 2,000 = Rs. 29,950 ✓
```

---

#### Test 5.4: Edit Advance Payment
**Time**: 5 minutes

**Step-by-Step**:
1. In detail view, find advance payment (shows in sale row)
2. Click edit icon on advance
3. Change:
   - Advance Amount: 3000 (was 2000)
   - Payment Method: Credit
4. Click "Save Advance"

**Verify**:
- [ ] Advance updates to Rs. 3,000
- [ ] Balance updates to Rs. 28,950

**New Balance**:
```
Balance = Rs. 39,950 - Rs. 8,000 - Rs. 3,000 = Rs. 28,950 ✓
```

---

#### Test 5.5: Add Multiple Purchases
**Time**: 5 minutes

**Step-by-Step**:
1. Click "Edit" on customer
2. Click "Add Another Purchase" button
3. Fill in second purchase:
   - Purchase Date: [Today's date]
   - Number of Crates: 30
   - Total Crate Price: 15000
4. Click "Save Entry"

**Verify**:
- [ ] Second purchase appears
- [ ] Total crates = 105
- [ ] Calculations update

---

#### Test 5.6: Add Return
**Time**: 5 minutes

**Step-by-Step**:
1. In detail view, click "New Return" button
2. Fill in:
   - Date: [Today's date]
   - Crates Returned: 10
   - Original Sale Value: 5000
   - New Agreed Cost: 4000
   - Remarks: "Damaged goods"
3. Click "Save Return"

**Verify**:
- [ ] Return appears in history
- [ ] Balance reduces by Rs. 1,000 (5000 - 4000)

---

#### Test 5.7: Add Multiple Payments
**Time**: 5 minutes

**Step-by-Step**:
1. Click "Add Multiple Payment" button
2. Fill in second payment:
   - Amount: 3000
   - Date: [Today's date]
   - Method: Bank
   - Account Number: "1111111111"
   - Account Holder: "Test Customer 1"
3. Click "Save Entry"

**Verify**:
- [ ] Second payment appears
- [ ] Total payments = Rs. 11,000
- [ ] Balance updates

---

### Phase 3: Delete & Verify

#### Test 6.1: Delete Sale
**Time**: 3 minutes

**Step-by-Step**:
1. In detail view, find sale record
2. Click delete icon
3. Confirm deletion

**Verify**:
- [ ] Sale removed from list
- [ ] Balance recalculates

---

#### Test 6.2: Delete Customer
**Time**: 3 minutes

**Step-by-Step**:
1. Go back to customer list
2. Find "Test Customer 1 (Updated)"
3. Click delete icon
4. Confirm deletion

**Verify**:
- [ ] Customer removed from list
- [ ] All related data deleted

---

## ✅ Final Verification

### Database Integrity Check
```
1. Open Supabase Dashboard
2. Check suppliers table - empty or has test data
3. Check truck_records table - empty or has test data
4. Check supplier_payments table - empty or has test data
5. Check customers table - empty or has test data
6. Check customer_sales table - empty or has test data
7. Check customer_payments table - empty or has test data
```

### Calculation Verification Summary
```
SUPPLIER:
  ✓ Gross Total = Sum(crates × rate)
  ✓ Commission = Gross × 13.6% (or custom %)
  ✓ Wari = Crates × 10 (or custom rate)
  ✓ Labour = Crates × 10 (or custom rate)
  ✓ Carriage = Crates × 10 (or custom rate)
  ✓ Balance = Net - (Carriage + Fare + Labour + Advance + Bardana + Payments)

CUSTOMER:
  ✓ Commission = Total × 7.25% (or custom %)
  ✓ Wari = Crates × 5 (or custom rate)
  ✓ Discount deducts from net bill
  ✓ Balance = Bill - (Payments + Advance)
```

### Edit Functionality Verification
```
SUPPLIER:
  ✓ Edit supplier profile - saves and persists
  ✓ Edit truck details - calculations update
  ✓ Edit rates - calculations update
  ✓ Edit payment - balance updates
  ✓ Add multiple parties - calculations update
  ✓ Add multiple payments - balance updates

CUSTOMER:
  ✓ Edit customer profile - saves and persists
  ✓ Edit sale - calculations update
  ✓ Edit rates - calculations update
  ✓ Edit payment - balance updates
  ✓ Edit advance - balance updates
  ✓ Add multiple purchases - calculations update
  ✓ Add return - balance reduces
  ✓ Add multiple payments - balance updates
```

---

## 🎯 Test Completion

**All tests completed**: [ ] YES [ ] NO

**Issues found**: [ ] NONE [ ] SOME

**Ready for production**: [ ] YES [ ] NO

**Tester Signature**: _______________
**Date**: _______________

---

**This guide ensures comprehensive testing of all functionality before production deployment.**
