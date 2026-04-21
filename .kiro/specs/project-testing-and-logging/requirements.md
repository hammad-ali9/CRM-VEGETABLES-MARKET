# Requirements Document

## Introduction

This feature adds comprehensive automated testing and structured logging to the Abbasi & Co Tomato Trading Management System — a React + TypeScript + Vite frontend backed by Supabase. The system manages suppliers, customers, truck records, payments, expenses, investors, partners, and users across six page modules.

The goal is twofold:
1. **Testing** — establish a full test suite covering pure calculation helpers, utility functions, React components, and integration-level store interactions, so that regressions are caught automatically.
2. **Logging** — replace ad-hoc `console.log` / `console.error` calls with a structured, levelled logger that records context (module, user, action, timestamp) and can be silenced in production or redirected to a remote sink.

---

## Glossary

- **Logger**: The centralised logging utility (`src/utils/logger.ts`) that wraps `console` with structured, levelled output.
- **Log Level**: One of `debug`, `info`, `warn`, `error` — controls which messages are emitted.
- **Log Entry**: A structured object containing `level`, `module`, `message`, `data`, and `timestamp`.
- **Test Runner**: Vitest — the test framework compatible with Vite projects.
- **Test Suite**: A `.test.ts` or `.test.tsx` file containing related test cases.
- **Unit Test**: A test that exercises a single pure function or component in isolation.
- **Integration Test**: A test that exercises multiple units together (e.g., store + Supabase mock).
- **Calculation Helper**: Any exported function from `src/store/index.ts` that computes a derived value (e.g., `calcSupplierBalance`, `calcSaleNet`).
- **Utility Function**: Any exported function from `src/utils/` (e.g., `downloadCSV`, `isWithinPrintPeriod`, `getPeriodLabel`).
- **Store**: The `useMandiStore` hook in `src/store/index.ts` that manages all application state and Supabase interactions.
- **Supplier**: A trading partner who delivers tomatoes via truck records.
- **Customer**: A buyer who purchases tomatoes and whose balance is tracked via sales, payments, and returns.
- **TruckRecord**: A single truck delivery record belonging to a Supplier, containing parties, crates, rates, and charges.
- **CustomerSale**: A single sale record belonging to a Customer.
- **CUSTOMER_COMMISSION_DIVISOR**: The constant `13.78` used to compute commission from gross sale value.
- **CASH_WARI_CUSTOMER**: The constant `5` (Rs per crate) used to compute cash wari.

---

## Requirements

### Requirement 1: Test Infrastructure Setup

**User Story:** As a developer, I want a properly configured test environment, so that I can run all tests with a single command and get reliable results.

#### Acceptance Criteria

1. THE Test_Runner SHALL be Vitest configured with `jsdom` as the test environment.
2. THE Test_Runner SHALL support React Testing Library for component tests.
3. THE Test_Runner SHALL produce a coverage report covering `src/` files when run with `--coverage`.
4. WHEN the command `npm test` is executed, THE Test_Runner SHALL run all test suites once (non-watch mode) and exit with a non-zero code if any test fails.
5. THE Test_Runner SHALL resolve path aliases (e.g., `@/`) consistent with `tsconfig.app.json` and `vite.config.ts`.
6. WHERE Supabase client calls are made, THE Test_Suite SHALL mock the `src/lib/supabase.ts` module so no real network requests are made during tests.

---

### Requirement 2: Calculation Helper Unit Tests

**User Story:** As a developer, I want unit tests for every calculation helper in `src/store/index.ts`, so that financial logic is verified and regressions are caught immediately.

#### Acceptance Criteria

1. THE Test_Suite SHALL contain tests for `calcTruckTotal`, `calcSupplierTotalBill`, `calcSupplierTotalAdvance`, `calcSupplierTotalCarriage`, `calcSupplierTotalPayments`, `calcSupplierGrossTotal`, `calcSupplierTotalReceived`, `calcSupplierTotalTruckFare`, `calcSupplierTotalLabour`, `calcSupplierTotalBardana`, and `calcSupplierBalance`.
2. THE Test_Suite SHALL contain tests for `calcSaleTotal`, `calcSaleCommission`, `calcSaleCashWari`, `calcSaleNet`, `calcSaleNetAfterDiscount`, `calcCustomerTotalBill`, `calcCustomerTotalPayments`, `calcCustomerTotalAdvance`, `calcCustomerTotalReturns`, `calcCustomerTotalDiscount`, and `calcCustomerBalance`.
3. WHEN a `Supplier` has trucks with parties and general payments, THE `calcSupplierBalance` function SHALL return `grossTotal − carriage − truckFare − labourCharges − advance − bardana − payments`.
4. WHEN a `CustomerSale` has `crates = 100` and `rate = 1000`, THE `calcSaleCommission` function SHALL return `Math.round(100000 / 13.78)` which equals `7257`.
5. WHEN a `CustomerSale` has `crates = 50` and `wariRate = 5`, THE `calcSaleCashWari` function SHALL return `250`.
6. WHEN a `Customer` has sales, payments, advances, and returns, THE `calcCustomerBalance` function SHALL return `totalBill − totalPayments − totalAdvance`.
7. FOR ALL valid `Supplier` inputs, THE `calcSupplierBalance` function SHALL equal `calcSupplierGrossTotal − calcSupplierTotalCarriage − calcSupplierTotalTruckFare − calcSupplierTotalLabour − calcSupplierTotalAdvance − calcSupplierTotalBardana − calcSupplierTotalPayments` (invariant property).
8. FOR ALL valid `Customer` inputs, THE `calcCustomerBalance` function SHALL equal `calcCustomerTotalBill − calcCustomerTotalPayments − calcCustomerTotalAdvance` (invariant property).
9. WHEN a `Supplier` has no trucks and no payments, THE `calcSupplierBalance` function SHALL return `0`.
10. WHEN a `Customer` has no sales, no payments, and no returns, THE `calcCustomerBalance` function SHALL return `0`.

---

### Requirement 3: Utility Function Unit Tests — `printUtils.ts`

**User Story:** As a developer, I want unit tests for `src/utils/printUtils.ts`, so that period filtering and label generation are verified for all supported periods.

#### Acceptance Criteria

1. WHEN `isWithinPrintPeriod` is called with a date string matching today's date and period `'daily'`, THE `isWithinPrintPeriod` function SHALL return `true`.
2. WHEN `isWithinPrintPeriod` is called with a date string from yesterday and period `'daily'`, THE `isWithinPrintPeriod` function SHALL return `false`.
3. WHEN `isWithinPrintPeriod` is called with a date string within the current calendar week and period `'weekly'`, THE `isWithinPrintPeriod` function SHALL return `true`.
4. WHEN `isWithinPrintPeriod` is called with a date string within the current calendar month and period `'monthly'`, THE `isWithinPrintPeriod` function SHALL return `true`.
5. WHEN `isWithinPrintPeriod` is called with period `'all'`, THE `isWithinPrintPeriod` function SHALL return `true` for any non-null date string.
6. WHEN `isWithinPrintPeriod` is called with a `null` or `undefined` date and period `'daily'`, THE `isWithinPrintPeriod` function SHALL return `false`.
7. WHEN `isWithinPrintPeriod` is called with a `null` or `undefined` date and period `'all'`, THE `isWithinPrintPeriod` function SHALL return `true`.
8. WHEN `getPeriodLabel` is called with period `'all'`, THE `getPeriodLabel` function SHALL return the string `'کل وقت'`.
9. WHEN `getPeriodLabel` is called with period `'monthly'`, THE `getPeriodLabel` function SHALL return a string containing the current year as a four-digit number.

---

### Requirement 4: Utility Function Unit Tests — `exportUtils.ts`

**User Story:** As a developer, I want unit tests for `src/utils/exportUtils.ts`, so that CSV generation logic is verified without triggering real browser downloads.

#### Acceptance Criteria

1. WHEN `downloadCSV` is called with a non-empty data array and headers, THE `downloadCSV` function SHALL create a `Blob` with MIME type `text/csv`.
2. WHEN `downloadCSV` is called with data containing a value that includes a double-quote character, THE `downloadCSV` function SHALL escape the double-quote by doubling it in the CSV output.
3. WHEN `downloadCSV` is called with an empty data array, THE `downloadCSV` function SHALL produce a CSV string containing only the header row.
4. WHEN `downloadCSV` is called, THE `downloadCSV` function SHALL append a hidden `<a>` element to the document body and then remove it after triggering the click.

---

### Requirement 5: Component Unit Tests — `PrintModal`

**User Story:** As a developer, I want unit tests for the `PrintModal` component, so that its rendering and interaction behaviour are verified.

#### Acceptance Criteria

1. WHEN `PrintModal` is rendered with a `title` prop, THE `PrintModal` component SHALL display that title text in the modal header.
2. WHEN the user clicks the close button, THE `PrintModal` component SHALL call the `onClose` callback.
3. WHEN the user selects a period option and clicks the print button, THE `PrintModal` component SHALL call the `onPrint` callback with the selected period value.
4. WHEN `PrintModal` is first rendered, THE `PrintModal` component SHALL have `'monthly'` selected as the default period.

---

### Requirement 6: Component Unit Tests — `Layout`

**User Story:** As a developer, I want unit tests for the `Layout` component, so that navigation rendering and role-based visibility are verified.

#### Acceptance Criteria

1. WHEN `Layout` is rendered with an `activeUser` whose `role` is `'admin'`, THE `Layout` component SHALL render a navigation item for the Users module.
2. WHEN `Layout` is rendered with an `activeUser` whose `role` is `'salesman'`, THE `Layout` component SHALL not render a navigation item for the Users module.
3. WHEN the sign-out button is clicked, THE `Layout` component SHALL call the `onSignOut` callback.
4. WHEN `Layout` is rendered with an `activeUser`, THE `Layout` component SHALL display the user's name in the sidebar.

---

### Requirement 7: Component Unit Tests — `App` Authentication Flow

**User Story:** As a developer, I want unit tests for the authentication flow in `App.tsx`, so that login and logout behaviour are verified.

#### Acceptance Criteria

1. WHEN the application loads and no user is stored in `localStorage`, THE `App` component SHALL render the login form.
2. WHEN valid credentials are submitted on the login form, THE `App` component SHALL render the main layout with the dashboard.
3. WHEN invalid credentials are submitted on the login form, THE `App` component SHALL display an error message.
4. WHEN the sign-out action is triggered, THE `App` component SHALL return to the login form and clear the active user from `localStorage`.

---

### Requirement 8: Store DB Mapper Unit Tests

**User Story:** As a developer, I want unit tests for the database row mapper functions in `src/store/index.ts`, so that data transformation between Supabase snake_case rows and camelCase domain objects is verified.

#### Acceptance Criteria

1. WHEN a raw Supabase `truck_records` row is mapped, THE Mapper SHALL produce a `TruckRecord` object with all camelCase fields correctly populated.
2. WHEN a raw Supabase `customer_sales` row is mapped, THE Mapper SHALL produce a `CustomerSale` object with `billNo`, `commPercent`, `wariRate`, `advance`, `advanceMethod`, `discount`, and `paymentMode` correctly populated.
3. WHEN a raw Supabase `supplier_payments` row is mapped, THE Mapper SHALL produce a `SupplierPayment` object with `accountNo` and `accountHolderName` defaulting to empty strings when the raw row has `null` values.
4. WHEN a raw Supabase `customer_returns` row is mapped, THE Mapper SHALL produce a `CustomerReturn` object with `newCost` mapped from `new_cost`.

---

### Requirement 9: Structured Logger Implementation

**User Story:** As a developer, I want a centralised structured logger, so that all application events are recorded consistently with context and can be controlled by log level.

#### Acceptance Criteria

1. THE Logger SHALL export a default logger instance with methods `debug`, `info`, `warn`, and `error`.
2. WHEN a log method is called, THE Logger SHALL emit a structured `Log_Entry` object containing `level`, `module`, `message`, `data` (optional), and `timestamp` (ISO 8601 string).
3. WHEN the active log level is set to `'warn'`, THE Logger SHALL suppress `debug` and `info` messages and emit only `warn` and `error` messages.
4. WHEN the active log level is set to `'error'`, THE Logger SHALL suppress `debug`, `info`, and `warn` messages and emit only `error` messages.
5. WHERE the application is running in production mode (`import.meta.env.PROD === true`), THE Logger SHALL default to log level `'warn'`.
6. WHERE the application is running in development mode (`import.meta.env.DEV === true`), THE Logger SHALL default to log level `'debug'`.
7. THE Logger SHALL accept a `module` string parameter on each call to identify the source component or file.
8. WHEN an `error` level message is logged, THE Logger SHALL call `console.error`; WHEN a `warn` level message is logged, THE Logger SHALL call `console.warn`; WHEN `info` or `debug` messages are logged, THE Logger SHALL call `console.log`.

---

### Requirement 10: Logger Integration — Store

**User Story:** As a developer, I want the store to use the structured logger, so that all Supabase operations and state mutations are traceable.

#### Acceptance Criteria

1. WHEN the store begins loading data from Supabase, THE Store SHALL emit an `info` log entry with module `'Store'` and a message indicating data load has started.
2. WHEN a Supabase table fetch succeeds, THE Store SHALL emit a `debug` log entry with module `'Store'` containing the table name and row count.
3. WHEN a Supabase operation returns an error, THE Store SHALL emit an `error` log entry with module `'Store'` containing the operation name and error message.
4. WHEN a new Supplier is created, THE Store SHALL emit an `info` log entry with module `'Store'` containing the supplier name and generated ID.
5. WHEN a new Customer is created, THE Store SHALL emit an `info` log entry with module `'Store'` containing the customer name and generated ID.
6. WHEN a TruckRecord is updated, THE Store SHALL emit a `debug` log entry with module `'Store'` containing the truck ID and the fields being updated.
7. WHEN a record is deleted (supplier, customer, truck, payment, expense, etc.), THE Store SHALL emit a `warn` log entry with module `'Store'` containing the entity type and ID.
8. THE Store SHALL replace all existing `console.log`, `console.error`, and `console.warn` calls with equivalent Logger calls at the appropriate level.

---

### Requirement 11: Logger Integration — Page Modules

**User Story:** As a developer, I want the page modules to use the structured logger for key user actions, so that user workflows can be traced in the browser console during development.

#### Acceptance Criteria

1. WHEN a form submission begins in `SupplierModule`, `CustomerModule`, `AccountsModule`, or `UserModule`, THE Module SHALL emit a `debug` log entry with the module name and action type (e.g., `'add'`, `'edit'`, `'delete'`).
2. WHEN a form submission succeeds, THE Module SHALL emit an `info` log entry with the module name and the ID of the created or updated record.
3. WHEN a form submission fails, THE Module SHALL emit an `error` log entry with the module name and the error details.
4. WHEN a print or export action is triggered, THE Module SHALL emit an `info` log entry with the module name, action type (`'print'` or `'export'`), and the number of records included.
5. THE Module SHALL replace all existing `console.log` and `console.error` calls with equivalent Logger calls at the appropriate level.

---

### Requirement 12: Logger Integration — App Authentication

**User Story:** As a developer, I want authentication events logged, so that login attempts and session changes are traceable.

#### Acceptance Criteria

1. WHEN a user successfully logs in, THE App SHALL emit an `info` log entry with module `'Auth'` containing the user's name and role.
2. WHEN a login attempt fails due to invalid credentials, THE App SHALL emit a `warn` log entry with module `'Auth'` containing the attempted username (but not the password).
3. WHEN a user logs out, THE App SHALL emit an `info` log entry with module `'Auth'` containing the user's name.

---

### Requirement 13: Logger Unit Tests

**User Story:** As a developer, I want unit tests for the Logger, so that its level-filtering and output behaviour are verified.

#### Acceptance Criteria

1. WHEN the Logger is configured with level `'warn'` and `logger.debug(...)` is called, THE Logger SHALL not call `console.log`.
2. WHEN the Logger is configured with level `'debug'` and `logger.error(...)` is called, THE Logger SHALL call `console.error`.
3. WHEN `logger.info('MyModule', 'test message', { key: 'value' })` is called, THE Logger SHALL pass a `Log_Entry` to `console.log` where `entry.module === 'MyModule'`, `entry.message === 'test message'`, and `entry.data.key === 'value'`.
4. WHEN `logger.warn(...)` is called, THE Logger SHALL call `console.warn` (not `console.log` or `console.error`).
5. WHEN the log level is changed at runtime, THE Logger SHALL immediately apply the new level to subsequent calls.
