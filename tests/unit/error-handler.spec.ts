import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleGitHubError,
  createAppError,
  getErrorMessage,
  requiresAuthAction,
  ErrorCategory,
  AppError,
} from '../../src/services/github/error-handler.ts';

describe('Error Handler', () => {
  describe('handleGitHubError', () => {
    test('should handle network fetch TypeError', () => {
      const error = new TypeError('Failed to fetch');
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.NETWORK);
      assert.equal(result.message, 'Network error. Please check your connection.');
      assert.equal(result.recoveryAction, 'Retry when online');
    });

    test('should handle Response with 401 status', () => {
      const error = new Response(null, { status: 401 });
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.AUTH);
      assert.equal(result.message, 'Authentication failed. Please check your GitHub token.');
      assert.equal(result.technicalDetails, 'HTTP 401');
    });

    test('should handle Response with 403 status', () => {
      const error = new Response(null, { status: 403 });
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.AUTH);
      assert.equal(result.message, 'Authentication failed. Please check your GitHub token.');
    });

    test('should handle Response with 404 status', () => {
      const error = new Response(null, { status: 404 });
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.NOT_FOUND);
      assert.equal(result.message, 'Resource not found.');
    });

    test('should handle Response with 422 status', () => {
      const error = new Response(null, { status: 422 });
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.VALIDATION);
      assert.equal(result.message, 'Invalid data. Please check your input.');
    });

    test('should handle Response with 429 status', () => {
      const error = new Response(null, { status: 429 });
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.RATE_LIMIT);
      assert.equal(result.message, 'Rate limit exceeded. Please wait before trying again.');
    });

    test('should handle Response with unknown status (e.g. 500)', () => {
      const error = new Response(null, { status: 500 });
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.UNKNOWN);
      assert.equal(result.message, 'Something went wrong. Please try again.');
    });

    test('should handle GitHub JSON object error with bad credentials', () => {
      const error = { message: 'bad credentials' };
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.AUTH);
      assert.equal(result.message, 'Invalid GitHub token.');
      assert.equal(result.technicalDetails, 'bad credentials');
    });

    test('should handle GitHub JSON object error with rate limit', () => {
      const error = { message: 'API rate limit exceeded for user ID.' };
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.RATE_LIMIT);
      assert.equal(result.message, 'GitHub API rate limit exceeded.');
    });

    test('should handle GitHub JSON object error with generic message', () => {
      const error = { message: 'Validation Failed', documentation_url: 'https://docs.github.com' };
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.VALIDATION);
      assert.equal(result.message, 'Validation Failed');
      assert.equal(result.technicalDetails, 'https://docs.github.com');
    });

    test('should handle GitHub JSON object with empty message fallback', () => {
      const error = { message: '' };
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.VALIDATION);
      assert.equal(result.message, 'An error occurred');
    });

    test('should handle generic standard Error', () => {
      const error = new Error('Random failure');
      const result = handleGitHubError(error, 'test-context');

      // Because an Error object has a 'message' property, it is caught by the
      // "if (error && typeof error === 'object' && 'message' in error)" block
      // and gets categorized as VALIDATION currently.
      assert.equal(result.category, ErrorCategory.VALIDATION);
      assert.equal(result.message, 'Random failure');
      assert.equal(result.technicalDetails, undefined);
    });

    test('should handle arbitrary string error', () => {
      const error = 'some weird error string';
      const result = handleGitHubError(error, 'test-context');

      assert.equal(result.category, ErrorCategory.UNKNOWN);
      assert.equal(result.message, 'An unexpected error occurred.');
      assert.equal(result.technicalDetails, 'some weird error string');
    });
  });

  describe('createAppError', () => {
    test('should create an AppError with required fields', () => {
      const error = createAppError(ErrorCategory.NETWORK, 'Network dropped');
      assert.equal(error.category, ErrorCategory.NETWORK);
      assert.equal(error.message, 'Network dropped');
      assert.equal(error.recoveryAction, undefined);
    });

    test('should create an AppError with optional recovery action', () => {
      const error = createAppError(ErrorCategory.AUTH, 'No token', 'Login again');
      assert.equal(error.category, ErrorCategory.AUTH);
      assert.equal(error.message, 'No token');
      assert.equal(error.recoveryAction, 'Login again');
    });
  });

  describe('getErrorMessage', () => {
    test('should extract message from AppError', () => {
      const error: AppError = { category: ErrorCategory.UNKNOWN, message: 'Test message' };
      assert.equal(getErrorMessage(error), 'Test message');
    });
  });

  describe('requiresAuthAction', () => {
    test('should return true if category is AUTH', () => {
      const error: AppError = { category: ErrorCategory.AUTH, message: '' };
      assert.equal(requiresAuthAction(error), true);
    });

    test('should return false if category is not AUTH', () => {
      const error: AppError = { category: ErrorCategory.NETWORK, message: '' };
      assert.equal(requiresAuthAction(error), false);
    });
  });
});
