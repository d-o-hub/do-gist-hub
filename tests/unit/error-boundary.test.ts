/**
 * Unit tests for Error Boundary Components
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/security/dom', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/utils/announcer', () => ({
  announcer: {
    announce: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { ErrorBoundary, initGlobalErrorHandling } from '../../src/components/ui/error-boundary';
import { ErrorCategory, type AppError } from '../../src/services/github/error-handler';
import { safeError } from '../../src/services/security/logger';
import { announcer } from '../../src/utils/announcer';

// ── Helper ──────────────────────────────────────────────────────────────

function makeAppError(overrides: Partial<AppError> = {}): AppError {
  return {
    message: 'Test error',
    category: ErrorCategory.UNKNOWN,
    code: 'TEST_ERR',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── render ──────────────────────────────────────────────────────────

  describe('render', () => {
    it('renders error fallback with message', () => {
      const error = makeAppError({ message: 'Something went wrong' });
      const html = ErrorBoundary.render(error);

      expect(html).toContain('Something went wrong');
      expect(html).toContain('role="alert"');
    });

    it('renders AUTH category with Auth Error icon', () => {
      const error = makeAppError({ category: ErrorCategory.AUTH });
      const html = ErrorBoundary.render(error);

      expect(html).toContain('Auth Error');
    });

    it('renders NETWORK category with Network Error icon', () => {
      const error = makeAppError({ category: ErrorCategory.NETWORK });
      const html = ErrorBoundary.render(error);

      expect(html).toContain('Network Error');
    });

    it('renders RATE_LIMIT category with Rate Limited icon', () => {
      const error = makeAppError({ category: ErrorCategory.RATE_LIMIT });
      const html = ErrorBoundary.render(error);

      expect(html).toContain('Rate Limited');
    });

    it('renders VALIDATION category with Validation Error icon', () => {
      const error = makeAppError({ category: ErrorCategory.VALIDATION });
      const html = ErrorBoundary.render(error);

      expect(html).toContain('Validation Error');
    });

    it('includes technical details when provided', () => {
      const error = makeAppError({ technicalDetails: 'Stack trace line 1' });
      const html = ErrorBoundary.render(error);

      expect(html).toContain('error-details');
      expect(html).toContain('Stack trace line 1');
    });

    it('does not include details section when technicalDetails is missing', () => {
      const error = makeAppError();
      const html = ErrorBoundary.render(error);

      expect(html).not.toContain('error-details');
    });

    it('includes retry button when onRetry is provided', () => {
      const error = makeAppError();
      const onRetry = vi.fn();
      const html = ErrorBoundary.render(error, onRetry);

      expect(html).toContain('retry-btn');
    });

    it('does not include reload button for non-fatal errors', () => {
      const error = makeAppError({ category: ErrorCategory.AUTH });
      const html = ErrorBoundary.render(error);

      expect(html).not.toContain('Reload App');
    });

    it('includes reload button for fatal NETWORK errors', () => {
      const error = makeAppError({ category: ErrorCategory.NETWORK });
      const html = ErrorBoundary.render(error);

      expect(html).toContain('Reload App');
    });

    it('includes reload button for fatal UNKNOWN errors', () => {
      const error = makeAppError({ category: ErrorCategory.UNKNOWN });
      const html = ErrorBoundary.render(error);

      expect(html).toContain('Reload App');
    });

    it('uses error.recoveryAction as button text when provided', () => {
      const error = makeAppError({ recoveryAction: 'Retry Now' });
      const onRetry = vi.fn();
      const html = ErrorBoundary.render(error, onRetry);

      expect(html).toContain('Retry Now');
    });
  });

  // ── bindEvents ──────────────────────────────────────────────────────

  describe('bindEvents', () => {
    it('calls onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      const error = makeAppError();
      container.innerHTML = ErrorBoundary.render(error, onRetry);
      document.body.appendChild(container);

      ErrorBoundary.bindEvents(container, onRetry);

      const retryBtn = container.querySelector('#error-retry-btn') as HTMLElement;
      retryBtn?.click();

      expect(onRetry).toHaveBeenCalled();
    });

    it('does not throw when retry button is missing', () => {
      const onRetry = vi.fn();
      container.innerHTML = '<div></div>';

      expect(() => {
        ErrorBoundary.bindEvents(container, onRetry);
      }).not.toThrow();
    });
  });

  // ── initGlobalErrorHandling ─────────────────────────────────────────

  describe('initGlobalErrorHandling', () => {
    beforeEach(() => {
      initGlobalErrorHandling();
    });

    it('captures global error events', () => {
      const errorEvent = new ErrorEvent('error', {
        error: new Error('Global error'),
        message: 'Global error',
      });
      window.dispatchEvent(errorEvent);

      expect(safeError).toHaveBeenCalledWith(
        '[Global] Uncaught error:',
        expect.objectContaining({ message: 'Global error' })
      );
      expect(announcer.error).toHaveBeenCalledWith('A critical error occurred');
    });

    it('captures unhandled promise rejections', () => {
      // Create a rejected promise and catch it to prevent Node.js unhandled rejection
      const rejected = Promise.reject(new Error('Async error'));
      rejected.catch(() => {});

      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        reason: new Error('Async error'),
        promise: rejected,
      });
      window.dispatchEvent(rejectionEvent);

      expect(safeError).toHaveBeenCalledWith(
        '[Global] Unhandled promise rejection:',
        expect.objectContaining({ message: 'Async error' })
      );
      expect(announcer.error).toHaveBeenCalledWith('An async operation failed');
    });
  });
});
