/**
 * Shared Test Cleanup Utilities
 *
 * Provides reusable cleanup functions for common test patterns in this codebase.
 * Import in test files to reduce boilerplate and prevent DOM leakage.
 *
 * @example
 * ```typescript
 * import { useContainer, cleanupSheets } from '../helpers/test-cleanup';
 *
 * describe('MyComponent', () => {
 *   const { container, setup, teardown } = useContainer();
 *
 *   beforeEach(setup);
 *   afterEach(() => { teardown(); cleanupSheets(); });
 * });
 * ```
 */

import { afterEach } from 'vitest';

// ── Container helpers ──────────────────────────────────────────────────

export interface ContainerScope {
  container: HTMLElement;
  setup: () => void;
  teardown: () => void;
}

/**
 * Creates a container div and appends/removes it from document body.
 * Call setup() in beforeEach and teardown() in afterEach.
 */
export function useContainer(): ContainerScope {
  const scope: ContainerScope = {
    container: document.createElement('div'),
    setup(): void {
      document.body.appendChild(scope.container);
    },
    teardown(): void {
      if (document.body.contains(scope.container)) {
        document.body.removeChild(scope.container);
      }
      scope.container.innerHTML = '';
    },
  };
  return scope;
}

// ── BottomSheet cleanup ────────────────────────────────────────────────

/**
 * Removes all BottomSheet DOM elements from the document.
 * Call in afterEach to prevent DOM leakage between tests.
 */
export function cleanupSheets(): void {
  document.querySelectorAll('.bottom-sheet').forEach((el) => el.remove());
  document.querySelectorAll('.bottom-sheet-backdrop').forEach((el) => el.remove());
}

// ── Global CSS mock ────────────────────────────────────────────────────

/**
 * Temporarily mocks globalThis.CSS for tests that need to control
 * CSS.supports behavior (e.g. scroll-progress bar tests).
 *
 * @example
 * ```typescript
 * const cssMock = useCSSMock({ supports: vi.fn(() => true) });
 * test('...', () => {
 *   cssMock.install();
 *   // ... test ...
 *   cssMock.restore();
 * });
 * ```
 */
export function useCSSMock(
  mock: Partial<typeof CSS> = {},
): { install: () => void; restore: () => void } {
  let original: typeof CSS | undefined;

  return {
    install(): void {
      original = globalThis.CSS;
      globalThis.CSS = {
        supports: vi.fn(() => true),
        ...mock,
      } as unknown as typeof CSS;
    },
    restore(): void {
      globalThis.CSS = original;
    },
  };
}

// ── NavRail cleanup ────────────────────────────────────────────────────

/**
 * Removes all .rail-nav elements from the document.
 * Call in afterEach when testing NavRail to prevent DOM leakage.
 */
export function cleanupNavRails(): void {
  document.querySelectorAll('.rail-nav').forEach((el) => el.remove());
}

// ── KeyboardEvent helper ───────────────────────────────────────────────

/**
 * Creates a keydown KeyboardEvent with the given key that bubbles.
 * Shorthand for KeyboardEvent constructor with common defaults.
 */
export function keydownEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true });
}

// ── Navigation event helper ────────────────────────────────────────────

/**
 * Creates an app:navigate CustomEvent with the given route and optional params.
 */
export function navigateEvent(
  route: string,
  params?: Record<string, string>,
): CustomEvent {
  return new CustomEvent('app:navigate', {
    detail: { route, ...(params ? { params } : {}) },
  });
}

// ── Auto-register cleanup (opt-in) ─────────────────────────────────────

/**
 * Registers automatic cleanup for common test side effects.
 * Call once at the top of a describe block:
 *
 * @example
 * ```typescript
 * import { autoCleanup } from '../helpers/test-cleanup';
 * autoCleanup(); // registers afterEach for sheets, nav rails
 * ```
 */
export function autoCleanup(): void {
  afterEach(() => {
    cleanupSheets();
    cleanupNavRails();
  });
}

// ── Toast mock helpers ─────────────────────────────────────────────────

/**
 * Returns a standard toast mock object for vitest mocking.
 * Usage in vi.mock factory:
 * ```typescript
 * vi.mock('../../src/components/ui/toast', () => ({ toast: mockToast() }));
 * ```
 */
export function mockToast() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };
}

/**
 * Returns a standard logger mock object for vitest mocking.
 * Usage in vi.mock factory:
 * ```typescript
 * vi.mock('../../src/services/security/logger', () => mockLogger());
 * ```
 */
export function mockLogger() {
  return {
    safeLog: vi.fn(),
    safeError: vi.fn(),
  };
}
