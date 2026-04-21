/**
 * Global test setup — runs before every test file.
 * Imports jest-dom matchers and resets mocks between tests.
 */
import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Reset all mocks after each test so state doesn't bleed between tests
afterEach(() => {
  vi.restoreAllMocks();
});
