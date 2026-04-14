/**
 * Secure logging utility with token redaction.
 * Ensures PATs and other secrets are never exposed in logs.
 */

/**
 * Redact a token, showing only first 6 and last 4 characters.
 * Returns '[REDACTED]' if token is too short.
 */
export function redactToken(token: string): string {
  if (!token || token.length <= 10) {
    return '[REDACTED]';
  }
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

/**
 * Redact any potential secrets in a string.
 * Looks for patterns like ghp_.*, gho_.*, github_pat_.*, etc.
 */
export function redactSecrets(input: string): string {
  if (!input) return input;

  // GitHub token patterns
  const patterns = [
    /(ghp_[A-Za-z0-9_]{36,})/g,         // Personal Access Token (classic)
    /(github_pat_[A-Za-z0-9_]{22,})/g,   // Fine-grained PAT
    /(gho_[A-Za-z0-9_]{36,})/g,         // OAuth token
    /(Bearer [A-Za-z0-9._-]{20,})/g,     // Bearer token
    /(token [A-Za-z0-9_]{20,})/g,        // Token header value
  ];

  let result = input;
  for (const pattern of patterns) {
    result = result.replace(pattern, '[REDACTED]');
  }

  return result;
}

/**
 * Safe console.log that redacts secrets.
 * Use instead of console.log for any output that might contain tokens.
 */
export function safeLog(...args: unknown[]): void {
  const redacted = args.map(arg => {
    if (typeof arg === 'string') {
      return redactSecrets(arg);
    }
    if (arg instanceof Error) {
      return new Error(redactSecrets(arg.message));
    }
    return arg;
  });
  console.log(...redacted);
}

/**
 * Safe console.error that redacts secrets.
 */
export function safeError(...args: unknown[]): void {
  const redacted = args.map(arg => {
    if (typeof arg === 'string') {
      return redactSecrets(arg);
    }
    if (arg instanceof Error) {
      return new Error(redactSecrets(arg.message));
    }
    return arg;
  });
  console.error(...redacted);
}

/**
 * Safe console.warn that redacts secrets.
 */
export function safeWarn(...args: unknown[]): void {
  const redacted = args.map(arg => {
    if (typeof arg === 'string') {
      return redactSecrets(arg);
    }
    if (arg instanceof Error) {
      return new Error(redactSecrets(arg.message));
    }
    return arg;
  });
  console.warn(...redacted);
}
