/**
 * Unit tests for src/services/github/error-handler.ts
 * Covers handleGitHubError, createAppError, getErrorMessage, requiresAuthAction
 */
import { describe, it, expect } from 'vitest';
import {
  handleGitHubError,
  createAppError,
  getErrorMessage,
  requiresAuthAction,
  ErrorCategory,
  type AppError,
} from '../../src/services/github/error-handler';

describe('ErrorHandler', () => {
  describe('handleGitHubError', () => {
    it('handles network/fetch TypeError', () => {
      const error = new TypeError('Failed to fetch');
      const result = handleGitHubError(error, 'list gists');
      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.message).toContain('Network error');
      expect(result.recoveryAction).toBe('Retry when online');
    });

    it('handles 401 response', () => {
      const response = new Response(null, { status: 401 });
      const result = handleGitHubError(response, 'authenticate');
      expect(result.category).toBe(ErrorCategory.AUTH);
      expect(result.message).toContain('Authentication failed');
    });

    it('handles 404 response', () => {
      const response = new Response(null, { status: 404 });
      const result = handleGitHubError(response, 'get gist');
      expect(result.category).toBe(ErrorCategory.NOT_FOUND);
      expect(result.message).toContain('Resource not found');
    });

    it('handles 429 response (rate limit)', () => {
      const response = new Response(null, { status: 429 });
      const result = handleGitHubError(response, 'list gists');
      expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(result.message).toContain('Rate limit exceeded');
    });

    it('handles 422 response (validation)', () => {
      const response = new Response(null, { status: 422 });
      const result = handleGitHubError(response, 'create gist');
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.message).toContain('Invalid data');
    });

    it('handles 403 response as auth', () => {
      const response = new Response(null, { status: 403 });
      const result = handleGitHubError(response, 'create gist');
      expect(result.category).toBe(ErrorCategory.AUTH);
    });

    it('handles unknown status codes', () => {
      const response = new Response(null, { status: 500 });
      const result = handleGitHubError(response, 'list gists');
      expect(result.category).toBe(ErrorCategory.UNKNOWN);
    });

    it('handles GitHub API error object with bad credentials', () => {
      // Source checks for lowercase 'bad credentials'
      const error = { message: 'bad credentials', documentation_url: 'https://docs.github.com' };
      const result = handleGitHubError(error, 'validate token');
      expect(result.category).toBe(ErrorCategory.AUTH);
      expect(result.message).toContain('Invalid GitHub token');
    });

    it('handles GitHub API error object with rate limit', () => {
      const error = { message: 'API rate limit exceeded' };
      const result = handleGitHubError(error, 'list gists');
      expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
    });

    it('handles generic GitHub API error object', () => {
      const error = { message: 'Not Found', documentation_url: 'https://docs.github.com' };
      const result = handleGitHubError(error, 'get gist');
      expect(result.category).toBe(ErrorCategory.VALIDATION);
    });

    it('handles generic Error instance as VALIDATION (matches message-in-object branch)', () => {
      // Error instances have 'message' property, so they match the GitHubError branch
      // and default to VALIDATION category
      const error = new Error('Something went terribly wrong');
      const result = handleGitHubError(error, 'unknown operation');
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.message).toContain('Something went terribly wrong');
    });

    it('handles string error', () => {
      const result = handleGitHubError('just a string error', 'test');
      expect(result.category).toBe(ErrorCategory.UNKNOWN);
      expect(result.technicalDetails).toBe('just a string error');
    });

      it('handles null error gracefully as UNKNOWN', () => {
      // null: 'typeof null === "object"' is true, but 'null && typeof null === "object"' is false
      // so it falls through to the generic error branch: 'error instanceof Error' is false
      // then the final generic return is used with String(null) = 'null'
      const result = handleGitHubError(null, 'test');
      expect(result.category).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('createAppError', () => {
    it('creates an AppError with the given category and message', () => {
      const error = createAppError(ErrorCategory.AUTH, 'Token expired', 'Re-enter token');
      expect(error.category).toBe(ErrorCategory.AUTH);
      expect(error.message).toBe('Token expired');
      expect(error.recoveryAction).toBe('Re-enter token');
    });

    it('creates an AppError without recovery action', () => {
      const error = createAppError(ErrorCategory.UNKNOWN, 'Something broke');
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.message).toBe('Something broke');
      expect(error.recoveryAction).toBeUndefined();
    });
  });

  describe('getErrorMessage', () => {
    it('returns the error message string', () => {
      const error: AppError = {
        category: ErrorCategory.AUTH,
        message: 'Token invalid',
      };
      expect(getErrorMessage(error)).toBe('Token invalid');
    });
  });

  describe('requiresAuthAction', () => {
    it('returns true for AUTH errors', () => {
      const error: AppError = {
        category: ErrorCategory.AUTH,
        message: 'Token invalid',
      };
      expect(requiresAuthAction(error)).toBe(true);
    });

    it('returns false for non-AUTH errors', () => {
      const error: AppError = {
        category: ErrorCategory.NOT_FOUND,
        message: 'Not found',
      };
      expect(requiresAuthAction(error)).toBe(false);
    });
  });
});
