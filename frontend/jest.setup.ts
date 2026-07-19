/**
 * Runs before every frontend suite (jest `setupFilesAfterEnv`).
 *
 * Registers jest-dom matchers and stubs the browser/Next.js APIs that jsdom
 * does not implement but our components touch on mount.
 */
import '@testing-library/jest-dom';

// Components read this to build absolute API URLs; pin it so assertions on
// fetch calls are stable regardless of the developer's local .env.
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5000/api';

// jsdom ships no matchMedia — responsive hooks call it during render.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

// Observer APIs used by scroll/reveal effects.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(global as any).IntersectionObserver = NoopObserver;
(global as any).ResizeObserver = NoopObserver;

window.scrollTo = jest.fn();
