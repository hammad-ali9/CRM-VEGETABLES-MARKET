/**
 * Component unit tests for src/components/Layout.tsx
 *
 * Covers:
 *  - Admin role sees Users nav item
 *  - Non-admin role does NOT see Users nav item
 *  - Sign-out callback
 *  - Active user name displayed in sidebar
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Layout from '../components/Layout';
import type { AppUser } from '../store/index';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    status: 'active',
    ...overrides,
  };
}

function renderLayout(overrides: Partial<React.ComponentProps<typeof Layout>> = {}) {
  const props = {
    children: <div>Page Content</div>,
    activePage: 'dashboard',
    setActivePage: vi.fn(),
    onSignOut: vi.fn(),
    activeUser: makeUser(),
    ...overrides,
  };
  render(<Layout {...props} />);
  return props;
}

// ─────────────────────────────────────────────
//  Role-based navigation
// ─────────────────────────────────────────────

describe('Layout — role-based navigation', () => {
  it("renders the Users nav item when activeUser role is 'admin'", () => {
    renderLayout({ activeUser: makeUser({ role: 'admin' }) });
    // The nav item label contains "Users"
    expect(screen.getByText(/یوزر مینجمنٹ/)).toBeInTheDocument();
  });

  it("does NOT render the Users nav item when activeUser role is 'salesman'", () => {
    renderLayout({ activeUser: makeUser({ role: 'salesman' }) });
    expect(screen.queryByText(/یوزر مینجمنٹ/)).not.toBeInTheDocument();
  });

  it("does NOT render the Users nav item when activeUser role is 'accountant'", () => {
    renderLayout({ activeUser: makeUser({ role: 'accountant' }) });
    expect(screen.queryByText(/یوزر مینجمنٹ/)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
//  Always-visible nav items
// ─────────────────────────────────────────────

describe('Layout — always-visible navigation', () => {
  it('renders Dashboard nav item for all roles', () => {
    renderLayout({ activeUser: makeUser({ role: 'salesman' }) });
    expect(screen.getByText(/ڈیش بورڈ/)).toBeInTheDocument();
  });

  it('renders Suppliers nav item for all roles', () => {
    renderLayout({ activeUser: makeUser({ role: 'salesman' }) });
    expect(screen.getByText(/بیوپاری/)).toBeInTheDocument();
  });

  it('renders Customers nav item for all roles', () => {
    renderLayout({ activeUser: makeUser({ role: 'salesman' }) });
    expect(screen.getByText(/خریدار/)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
//  Sign-out
// ─────────────────────────────────────────────

describe('Layout — sign-out', () => {
  it('calls onSignOut when the log-out button is clicked', () => {
    const { onSignOut } = renderLayout();
    fireEvent.click(screen.getByText(/لاگ آؤٹ/));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────
//  User info display
// ─────────────────────────────────────────────

describe('Layout — user info', () => {
  it("displays the active user's name in the sidebar", () => {
    renderLayout({ activeUser: makeUser({ name: 'Khalid Abbasi' }) });
    expect(screen.getByText('Khalid Abbasi')).toBeInTheDocument();
  });

  it("displays the active user's role in the sidebar", () => {
    renderLayout({ activeUser: makeUser({ role: 'admin', name: 'Admin User' }) });
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
//  Children rendering
// ─────────────────────────────────────────────

describe('Layout — children', () => {
  it('renders the children content', () => {
    renderLayout({ children: <div>My Page Content</div> });
    expect(screen.getByText('My Page Content')).toBeInTheDocument();
  });
});
