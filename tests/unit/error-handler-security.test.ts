import { describe, it, expect } from 'vitest';
import { handleGitHubError } from '../../src/services/github/error-handler';

describe('ErrorHandler Security', () => {
  it('should redact secrets in message for generic Errors', () => {
    const secret = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
    const error = new Error(`Connection failed for ${secret}`);
    const result = handleGitHubError(error, 'test-context');

    // Generic Errors have their message in the 'message' field of AppError
    expect(result.message).not.toContain(secret);
    expect(result.message).toContain('[REDACTED]');
  });

  it('should redact secrets in message for GitHub API error objects', () => {
    const secret = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
    const error = { message: `Invalid request with ${secret}` };
    const result = handleGitHubError(error, 'test-context');

    expect(result.message).not.toContain(secret);
    expect(result.message).toContain('[REDACTED]');
  });
});
