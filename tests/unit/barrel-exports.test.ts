/**
 * Barrel export verification tests.
 * Ensures all index.ts barrel files correctly re-export their modules.
 * These files are pure re-exports — verifying the exports exist suffices.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Mock all underlying service modules to avoid side effects ──

vi.mock('../../src/services/github/auth', () => ({
  getToken: vi.fn(),
  isAuthenticated: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

vi.mock('../../src/services/github/client', () => ({
  validateToken: vi.fn(),
  listGists: vi.fn(),
  listStarredGists: vi.fn(),
  getGist: vi.fn(),
  createGist: vi.fn(),
  updateGist: vi.fn(),
  deleteGist: vi.fn(),
  starGist: vi.fn(),
  unstarGist: vi.fn(),
  checkIfStarred: vi.fn(),
  forkGist: vi.fn(),
  listGistRevisions: vi.fn(),
  cancelAllRequests: vi.fn(),
  clearUsernameCache: vi.fn(),
}));

vi.mock('../../src/services/github/error-handler', () => ({
  isRetryableError: vi.fn(),
  handleGitHubError: vi.fn(),
}));

vi.mock('../../src/services/github/rate-limiter', () => ({
  getRateLimitState: vi.fn(),
  getTimeUntilReset: vi.fn(),
  isSafeToRequest: vi.fn(),
  resetRateLimit: vi.fn(),
  trackRateLimit: vi.fn(),
}));

vi.mock('../../src/services/perf/budgets', () => ({
  PERFORMANCE_BUDGETS: { LCP: 2500, FCP: 1800, CLS: 0.1, INP: 200 },
}));

vi.mock('../../src/services/perf/interaction-timer', () => ({
  InteractionTimer: vi.fn(),
  measureAsync: vi.fn(),
}));

vi.mock('../../src/services/perf/web-vitals', () => ({
  initWebVitals: vi.fn(),
  getStoredMetrics: vi.fn(),
}));

vi.mock('../../src/services/db', () => ({
  getEtag: vi.fn(),
  setEtag: vi.fn(),
  getMetadata: vi.fn(),
  setMetadata: vi.fn(),
}));

// ── Services / Security ──────────────────────────────

describe('src/services/security/index.ts barrel', () => {
  it('re-exports crypto utilities', async () => {
    const mod = await import('../../src/services/security');
    expect(mod).toHaveProperty('decrypt');
    expect(mod).toHaveProperty('encrypt');
  });

  it('re-exports DOM security utilities', async () => {
    const mod = await import('../../src/services/security');
    expect(mod).toHaveProperty('html');
    expect(mod).toHaveProperty('sanitizeHtml');
  });

  it('re-exports logger utilities', async () => {
    const mod = await import('../../src/services/security');
    expect(mod).toHaveProperty('redactSecrets');
    expect(mod).toHaveProperty('redactToken');
    expect(mod).toHaveProperty('safeError');
    expect(mod).toHaveProperty('safeLog');
    expect(mod).toHaveProperty('safeWarn');
  });
});

// ── Services / GitHub ────────────────────────────────

describe('src/services/github/index.ts barrel', () => {
  it('re-exports auth functions', async () => {
    const mod = await import('../../src/services/github');
    expect(mod).toHaveProperty('getToken');
    expect(mod).toHaveProperty('isAuthenticated');
    expect(mod).toHaveProperty('setToken');
    expect(mod).toHaveProperty('clearToken');
  });

  it('re-exports client API functions', async () => {
    const mod = await import('../../src/services/github');
    expect(mod).toHaveProperty('validateToken');
    expect(mod).toHaveProperty('listGists');
    expect(mod).toHaveProperty('getGist');
    expect(mod).toHaveProperty('createGist');
    expect(mod).toHaveProperty('deleteGist');
    expect(mod).toHaveProperty('starGist');
    expect(mod).toHaveProperty('forkGist');
  });

  it('re-exports error handler', async () => {
    const mod = await import('../../src/services/github');
    expect(mod).toHaveProperty('handleGitHubError');
    expect(mod).toHaveProperty('isRetryableError');
  });

  it('re-exports rate limiter', async () => {
    const mod = await import('../../src/services/github');
    expect(mod).toHaveProperty('getRateLimitState');
    expect(mod).toHaveProperty('getTimeUntilReset');
    expect(mod).toHaveProperty('isSafeToRequest');
    expect(mod).toHaveProperty('resetRateLimit');
  });
});

// ── Services / Perf ─────────────────────────────────

describe('src/services/perf/index.ts barrel', () => {
  it('re-exports budgets', async () => {
    const mod = await import('../../src/services/perf');
    expect(mod).toHaveProperty('PERFORMANCE_BUDGETS');
  });

  it('re-exports interaction timer', async () => {
    const mod = await import('../../src/services/perf');
    expect(mod).toHaveProperty('InteractionTimer');
    expect(mod).toHaveProperty('measureAsync');
  });

  it('re-exports web vitals', async () => {
    const mod = await import('../../src/services/perf');
    expect(mod).toHaveProperty('initWebVitals');
    expect(mod).toHaveProperty('getStoredMetrics');
  });
});

// ── Services / PWA ──────────────────────────────────

describe('src/services/pwa/index.ts barrel', () => {
  it('re-exports register-sw', async () => {
    const mod = await import('../../src/services/pwa');
    expect(mod).toHaveProperty('registerServiceWorker');
    expect(mod).toHaveProperty('isInstalled');
  });
});

// ── Types ────────────────────────────────────────────
// NOTE: src/types/index.ts uses `export type { ... }` which is erased at runtime.
// These are compile-time only re-exports and can't be tested with runtime assertions.
// Coverage tools correctly show 0% because there are zero executable statements.
// Uncomment the test below only if the barrel is changed to include runtime exports.
/*
describe('src/types/index.ts barrel', () => {
  it('can be imported without error', async () => {
    await expect(import('../../src/types')).resolves.toBeDefined();
  });
});
*/

// ── Tokens ───────────────────────────────────────────

describe('src/tokens/index.ts barrel', () => {
  it('re-exports component tokens', async () => {
    const mod = await import('../../src/tokens');
    expect(mod).toHaveProperty('buttonTokens');
  });

  it('re-exports elevation tokens', async () => {
    const mod = await import('../../src/tokens');
    expect(mod).toHaveProperty('shadowTokens');
    expect(mod).toHaveProperty('zIndex');
  });

  it('re-exports motion tokens', async () => {
    const mod = await import('../../src/tokens');
    expect(mod).toHaveProperty('motionTokens');
  });

  it('re-exports primitive tokens', async () => {
    const mod = await import('../../src/tokens');
    expect(mod).toHaveProperty('colors');
    expect(mod).toHaveProperty('radius');
    expect(mod).toHaveProperty('spacing');
    expect(mod).toHaveProperty('fontFamily');
    expect(mod).toHaveProperty('fontSize');
    expect(mod).toHaveProperty('fontWeight');
    expect(mod).toHaveProperty('lineHeight');
  });

  it('re-exports responsive tokens', async () => {
    const mod = await import('../../src/tokens');
    expect(mod).toHaveProperty('breakpoints');
    expect(mod).toHaveProperty('containerWidths');
  });

  it('re-exports semantic tokens', async () => {
    const mod = await import('../../src/tokens');
    expect(mod).toHaveProperty('colorSemantic');
  });
});

// ── Tokens / Component ──────────────────────────────

describe('src/tokens/component/index.ts barrel', () => {
  it('re-exports component token modules', async () => {
    const mod = await import('../../src/tokens/component');
    expect(mod).toHaveProperty('buttonTokens');
    expect(mod).toHaveProperty('gistCard');
    expect(mod).toHaveProperty('navTokens');
  });
});
