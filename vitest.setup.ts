import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// `server-only` throws outside a React Server environment; tests import server modules directly.
vi.mock('server-only', () => ({}));

// Server tests opt into the node environment (`// @vitest-environment node`): no DOM to patch.
const hasDom = typeof window !== 'undefined';

// antd's responsive components rely on matchMedia, which jsdom does not implement.
if (hasDom) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// antd's autosizing inputs and virtual lists observe element size, which jsdom does not implement.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  if (!hasDom) return;
  cleanup();
  localStorage.clear();
});
