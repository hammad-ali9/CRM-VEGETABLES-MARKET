/**
 * Mock for src/lib/supabase.ts
 * Prevents any real network calls during tests.
 * Each test can override the resolved value via vi.mocked().
 */
import { vi } from 'vitest';

const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ data: [], error: null }),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
});

export const supabase = {
  from: mockFrom,
};
