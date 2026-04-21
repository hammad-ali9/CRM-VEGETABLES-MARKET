# Abbasi & Co — Tomato Trading Management System

A React + TypeScript + Vite frontend backed by Supabase for managing the day-to-day operations of a tomato trading business. The system handles suppliers, customers, truck records, payments, expenses, investors, partners, and users across six page modules.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Database](#database)
- [Authentication](#authentication)

---

## Features

- **Supplier Management** — track truck deliveries, parties, carriage, labour, advances, bardana, and payments
- **Customer Management** — manage sales, commissions, cash wari, returns, discounts, and payments
- **Accounts Module** — expenses, investors, partners, and profit/loss overview
- **Reports Module** — aggregated financial reports with print support
- **User Management** — role-based access (admin, accountant, salesman)
- **Print & Export** — period-filtered printable reports and CSV exports
- **Persistent Auth** — login state survives page refresh via localStorage

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Backend / DB | Supabase (PostgreSQL) |
| State Management | Custom Zustand-style hook (`useMandiStore`) |
| Charts | Recharts |
| Icons | Lucide React |
| Testing | Vitest + React Testing Library + jsdom |
| Linting | ESLint + typescript-eslint |

---

## Project Structure

```
src/
├── assets/             # Static assets (images, icons)
├── components/
│   ├── Layout.tsx      # App shell with sidebar navigation
│   └── PrintModal.tsx  # Period-selection modal for printing
├── lib/
│   └── supabase.ts     # Supabase client initialisation
├── pages/
│   ├── Dashboard.tsx
│   ├── SupplierModule.tsx
│   ├── CustomerModule.tsx
│   ├── AccountsModule.tsx
│   ├── ReportsModule.tsx
│   └── UserModule.tsx
├── store/
│   └── index.ts        # Global state, all CRUD operations, calc helpers
├── tests/              # Test suites (excluded from app build)
│   ├── setup.ts
│   ├── calculations.test.ts
│   ├── mappers.test.ts
│   ├── printUtils.test.ts
│   ├── exportUtils.test.ts
│   ├── PrintModal.test.tsx
│   ├── Layout.test.tsx
│   └── App.test.tsx
├── utils/
│   ├── exportUtils.ts  # CSV download helper
│   ├── printTemplate.ts# HTML print window generator
│   └── printUtils.ts   # Period filtering and label helpers
└── App.tsx             # Root component + auth flow
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the schema from `database-migration.sql`

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment template and fill in your Supabase credentials
cp .env.example .env

# 3. Start the development server
npm run dev
```

---

## Environment Variables

Create a `.env` file at the project root (copy from `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Both values are available in your Supabase dashboard under **Project Settings → API**.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the codebase |
| `npm test` | Run all tests once (CI mode, exits with non-zero on failure) |
| `npm run test:watch` | Run tests in watch mode during development |
| `npm run test:coverage` | Run tests and generate a V8 coverage report |

---

## Testing

The project uses **Vitest** with **jsdom** and **React Testing Library**. Tests live in `src/tests/` and are excluded from the production TypeScript build.

### Running Tests

```bash
# Single run (used in CI)
npm test

# Watch mode (during development)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Test Suites

| File | Tests | What it covers |
|---|---|---|
| `calculations.test.ts` | 42 | All supplier & customer financial calculation helpers, invariant properties, edge cases |
| `mappers.test.ts` | 22 | Supabase snake_case row → camelCase domain object mappers for trucks, sales, payments, returns |
| `printUtils.test.ts` | 14 | `isWithinPrintPeriod` for all 4 periods (daily/weekly/monthly/all) including null/undefined dates, `getPeriodLabel` |
| `exportUtils.test.ts` | 7 | CSV content generation, Blob MIME type, double-quote escaping, DOM anchor lifecycle |
| `PrintModal.test.tsx` | 8 | Title rendering, default period selection, all period options, close and cancel callbacks |
| `Layout.test.tsx` | 9 | Role-based nav (admin sees Users, salesman does not), sign-out, user name display |
| `App.test.tsx` | 5 | Login form render, valid login, invalid credentials error, sign-out, localStorage persistence |

**Total: 108 tests across 7 files.**

### Key Calculation Constants

| Constant | Value | Purpose |
|---|---|---|
| `CUSTOMER_COMMISSION_DIVISOR` | `13.78` | Commission = `totalSaleValue / 13.78` |
| `CASH_WARI_CUSTOMER` | `5` | Cash wari = `crates × 5` (Rs per crate) |
| `CHARITY_PERCENT` | `10` | 10% of gross profit donated to charity |

### Supplier Balance Formula

```
balance = grossTotal − carriage − truckFare − labourCharges − advance − bardana − payments
```

### Customer Balance Formula

```
balance = totalBill − totalPayments − totalAdvance
totalBill = Σ(saleNetAfterDiscount) − Σ(returnNewCost)
```

---

## Database

Run `database-migration.sql` against your Supabase project to create all required tables:

- `suppliers`, `truck_records`, `supplier_payments`
- `customers`, `customer_sales`, `customer_payments`, `customer_returns`
- `expenses`, `investors`, `partners`, `app_users`

---

## Authentication

Authentication is handled entirely in the frontend against the `app_users` table in Supabase. There is no Supabase Auth integration — users log in with an email/ID and password stored in the database.

**Default credentials** (created automatically if no users exist):

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `123` |
| Role | `admin` |

Login state is persisted in `localStorage` under the key `abbasi_active_user`. Clearing this key or clicking Log Out ends the session.

### Roles

| Role | Access |
|---|---|
| `admin` | All modules including User Management |
| `accountant` | All modules except User Management |
| `salesman` | All modules except User Management |
