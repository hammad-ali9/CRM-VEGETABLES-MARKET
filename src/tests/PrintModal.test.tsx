/**
 * Component unit tests for src/components/PrintModal.tsx
 *
 * Covers:
 *  - Title rendering
 *  - Close button callback
 *  - Print button callback with selected period
 *  - Default period selection ('monthly')
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrintModal from '../components/PrintModal';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function renderModal(overrides: Partial<React.ComponentProps<typeof PrintModal>> = {}) {
  const props = {
    title: 'Test Report',
    onClose: vi.fn(),
    onPrint: vi.fn(),
    ...overrides,
  };
  render(<PrintModal {...props} />);
  return props;
}

// ─────────────────────────────────────────────
//  Rendering
// ─────────────────────────────────────────────

describe('PrintModal — rendering', () => {
  it('displays the title prop in the modal header', () => {
    renderModal({ title: 'سپلائر رپورٹ' });
    expect(screen.getByText('سپلائر رپورٹ')).toBeInTheDocument();
  });

  it('renders all four period options', () => {
    renderModal();
    expect(screen.getByText('یومیہ')).toBeInTheDocument();
    expect(screen.getByText('ہفتہ وار')).toBeInTheDocument();
    expect(screen.getByText('ماہانہ')).toBeInTheDocument();
    expect(screen.getByText('کل وقت')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
//  Default selection
// ─────────────────────────────────────────────

describe('PrintModal — default period', () => {
  it("has 'monthly' selected by default", () => {
    const { onPrint } = renderModal();
    // Click the print button without changing the selection
    fireEvent.click(screen.getByText('پرنٹ کریں'));
    expect(onPrint).toHaveBeenCalledWith('monthly');
  });
});

// ─────────────────────────────────────────────
//  Interactions
// ─────────────────────────────────────────────

describe('PrintModal — interactions', () => {
  it('calls onClose when the close (X) button is clicked', () => {
    const { onClose } = renderModal();
    // The X button is the one in the modal header
    const closeButtons = screen.getAllByRole('button');
    // First button with X icon — find by aria or by position
    const cancelBtn = screen.getByText('منسوخ');
    // Also test the X icon button (first button in header)
    const xBtn = closeButtons.find(btn => btn !== cancelBtn && btn !== screen.getByText('پرنٹ کریں'));
    if (xBtn) fireEvent.click(xBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the cancel button is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByText('منسوخ'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onPrint with 'daily' when daily is selected and print is clicked", () => {
    const { onPrint } = renderModal();
    fireEvent.click(screen.getByText('یومیہ'));
    fireEvent.click(screen.getByText('پرنٹ کریں'));
    expect(onPrint).toHaveBeenCalledWith('daily');
  });

  it("calls onPrint with 'weekly' when weekly is selected and print is clicked", () => {
    const { onPrint } = renderModal();
    fireEvent.click(screen.getByText('ہفتہ وار'));
    fireEvent.click(screen.getByText('پرنٹ کریں'));
    expect(onPrint).toHaveBeenCalledWith('weekly');
  });

  it("calls onPrint with 'all' when all is selected and print is clicked", () => {
    const { onPrint } = renderModal();
    fireEvent.click(screen.getByText('کل وقت'));
    fireEvent.click(screen.getByText('پرنٹ کریں'));
    expect(onPrint).toHaveBeenCalledWith('all');
  });

  it("calls onPrint with 'monthly' when monthly is explicitly selected and print is clicked", () => {
    const { onPrint } = renderModal();
    fireEvent.click(screen.getByText('ماہانہ'));
    fireEvent.click(screen.getByText('پرنٹ کریں'));
    expect(onPrint).toHaveBeenCalledWith('monthly');
  });
});
