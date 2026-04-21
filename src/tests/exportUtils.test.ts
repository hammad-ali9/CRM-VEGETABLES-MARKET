/**
 * Unit tests for src/utils/exportUtils.ts
 *
 * Tests CSV generation, blob creation, double-quote escaping,
 * empty data handling, and DOM anchor element lifecycle.
 *
 * Strategy: intercept the CSV string by replacing global.Blob with a
 * proper constructor mock (class syntax required by Vitest for `new`).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadCSV } from '../utils/exportUtils';

// ─────────────────────────────────────────────
//  Setup: mock URL.createObjectURL
// ─────────────────────────────────────────────

beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = vi.fn();
});

// ─────────────────────────────────────────────
//  Helper: capture CSV string via Blob constructor mock
// ─────────────────────────────────────────────

function captureCSV(fn: () => void): { content: string; type: string } {
  let capturedContent = '';
  let capturedType = '';

  // Must use class syntax so `new Blob(...)` works
  const MockBlob = vi.fn(function (this: any, parts: BlobPart[], options?: BlobPropertyBag) {
    capturedContent = (parts as string[])[0] ?? '';
    capturedType = options?.type ?? '';
    this.size = capturedContent.length;
    this.type = capturedType;
  });

  const originalBlob = global.Blob;
  global.Blob = MockBlob as unknown as typeof Blob;

  try {
    fn();
  } finally {
    global.Blob = originalBlob;
  }

  return { content: capturedContent, type: capturedType };
}

// ─────────────────────────────────────────────
//  Blob creation
// ─────────────────────────────────────────────

describe('downloadCSV — Blob creation', () => {
  it('creates a Blob with MIME type text/csv', () => {
    const { type } = captureCSV(() => {
      downloadCSV([['Alice', '30']], ['Name', 'Age'], 'test.csv');
    });
    expect(type).toContain('text/csv');
  });
});

// ─────────────────────────────────────────────
//  CSV content
// ─────────────────────────────────────────────

describe('downloadCSV — CSV content', () => {
  it('includes the header row', () => {
    const { content } = captureCSV(() => {
      downloadCSV([], ['Name', 'Age', 'City'], 'test.csv');
    });
    expect(content).toContain('Name,Age,City');
  });

  it('produces only the header row when data array is empty', () => {
    const { content } = captureCSV(() => {
      downloadCSV([], ['Col1', 'Col2'], 'empty.csv');
    });
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Col1,Col2');
  });

  it('includes data rows after the header', () => {
    const { content } = captureCSV(() => {
      downloadCSV(
        [['Alice', '30'], ['Bob', '25']],
        ['Name', 'Age'],
        'people.csv'
      );
    });
    expect(content).toContain('"Alice"');
    expect(content).toContain('"Bob"');
  });

  it('escapes double-quote characters by doubling them', () => {
    const { content } = captureCSV(() => {
      // Value contains a double-quote: He said "hello"
      downloadCSV(
        [['He said "hello"', '42']],
        ['Quote', 'Number'],
        'quotes.csv'
      );
    });
    // The double-quote should be escaped as ""
    expect(content).toContain('He said ""hello""');
  });
});

// ─────────────────────────────────────────────
//  DOM anchor element lifecycle
// ─────────────────────────────────────────────

describe('downloadCSV — DOM anchor lifecycle', () => {
  it('appends a hidden <a> element and removes it after click', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    const mockClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = mockClick;
      }
      return el;
    });

    downloadCSV([['test']], ['Col'], 'test.csv');

    expect(appendSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledOnce();
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('sets the download attribute to the provided filename', () => {
    let capturedLink: HTMLAnchorElement | null = null;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        capturedLink = el as HTMLAnchorElement;
        el.click = vi.fn();
      }
      return el;
    });

    downloadCSV([], ['H'], 'my-report.csv');

    expect(capturedLink).not.toBeNull();
    expect(capturedLink!.getAttribute('download')).toBe('my-report.csv');
  });
});
