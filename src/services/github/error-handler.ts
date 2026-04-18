import { safeError } from '../security/logger';
/**
 * GitHub API Error Handler
 * Converts API errors to user-friendly messages
 */

import type { GitHubError } from '../../types/api';

/**
 * Error taxonomy for GitHub API errors
 */
export enum ErrorCategory {
  AUTH = 'AUTH',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}

/**
 * User-safe error with recovery actions
 */
export interface AppError {
  category: ErrorCategory;
  message: string;
  recoveryAction?: string;
  technicalDetails?: string;
}

/**
 * Map HTTP status codes to error categories
 */
function categorizeStatus(status: number): ErrorCategory {
  switch (status) {
    case 401:
      return ErrorCategory.AUTH;
    case 403:
      // Could be auth or rate limit — check response headers in caller
      return ErrorCategory.AUTH;
    case 404:
      return ErrorCategory.NOT_FOUND;
    case 422:
      return ErrorCategory.VALIDATION;
    case 429:
      return ErrorCategory.RATE_LIMIT;
    default:
      return ErrorCategory.UNKNOWN;
  }
}

/**
 * Convert GitHub API error to user-friendly message
 */
export function handleGitHubError(error: unknown, context: string): AppError {
  safeError(`[Error Handler] ${context}:`, error);

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      category: ErrorCategory.NETWORK,
      message: 'Network error. Please check your connection.',
      recoveryAction: 'Retry when online',
    };
  }

  // Response errors
  if (error instanceof Response) {
    const status = error.status;
    const category = categorizeStatus(status);

    switch (category) {
      case ErrorCategory.AUTH:
        return {
          category: ErrorCategory.AUTH,
          message: 'Authentication failed. Please check your GitHub token.',
          recoveryAction: 'Re-enter token in Settings',
          technicalDetails: `HTTP ${status}`,
        };

      case ErrorCategory.NOT_FOUND:
        return {
          category: ErrorCategory.NOT_FOUND,
          message: 'Resource not found.',
          recoveryAction: 'Refresh the list',
          technicalDetails: `HTTP ${status}`,
        };

      case ErrorCategory.RATE_LIMIT:
        return {
          category: ErrorCategory.RATE_LIMIT,
          message: 'Rate limit exceeded. Please wait before trying again.',
          recoveryAction: 'Wait a few minutes and retry',
          technicalDetails: `HTTP ${status}`,
        };

      case ErrorCategory.VALIDATION:
        return {
          category: ErrorCategory.VALIDATION,
          message: 'Invalid data. Please check your input.',
          recoveryAction: 'Review and correct the form',
          technicalDetails: `HTTP ${status}`,
        };

      default:
        return {
          category: ErrorCategory.UNKNOWN,
          message: 'Something went wrong. Please try again.',
          recoveryAction: 'Retry',
          technicalDetails: `HTTP ${status}`,
        };
    }
  }

  // GitHub API error response
  if (error && typeof error === 'object' && 'message' in error) {
    const ghError = error as GitHubError;

    if (ghError.message.includes('bad credentials')) {
      return {
        category: ErrorCategory.AUTH,
        message: 'Invalid GitHub token.',
        recoveryAction: 'Re-enter token in Settings',
        technicalDetails: ghError.message,
      };
    }

    if (ghError.message.includes('rate limit')) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        message: 'GitHub API rate limit exceeded.',
        recoveryAction: 'Wait before retrying',
        technicalDetails: ghError.message,
      };
    }

    return {
      category: ErrorCategory.VALIDATION,
      message: ghError.message || 'An error occurred',
      recoveryAction: 'Review and retry',
      technicalDetails: ghError.documentation_url,
    };
  }

  // Generic error
  return {
    category: ErrorCategory.UNKNOWN,
    message: 'An unexpected error occurred.',
    recoveryAction: 'Retry or restart the app',
    technicalDetails: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Create a custom error for app-specific scenarios
 */
export function createAppError(
  category: ErrorCategory,
  message: string,
  recoveryAction?: string
): AppError {
  return {
    category,
    message,
    recoveryAction,
  };
}

/**
 * Get user-friendly error message from AppError
 */
export function getErrorMessage(error: AppError): string {
  return error.message;
}

/**
 * Check if error requires authentication action
 */
export function requiresAuthAction(error: AppError): boolean {
  return error.category === ErrorCategory.AUTH;
}
