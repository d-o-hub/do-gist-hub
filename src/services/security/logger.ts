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
    /(ghp_[A-Za-z0-9_]{36,})/g, // Personal Access Token (classic)
    /(github_pat_[A-Za-z0-9_]{22,})/g, // Fine-grained PAT
    /(gho_[A-Za-z0-9_]{36,})/g, // OAuth token
    /(Bearer [A-Za-z0-9._-]{20,})/g, // Bearer token
    /(token [A-Za-z0-9_]{20,})/g, // Token header value
  ];

  let result = input;
  for (const pattern of patterns) {
    result = result.replace(pattern, '[REDACTED]');
  }

  return result;
}

/**
 * Recursively redact secrets in any value.
 * Handles strings, Errors, arrays, and nested objects.
 * Implements cycle detection and depth limiting.
 */
export function redactAny(arg: unknown, depth = 0, seen = new WeakSet()): unknown {
  // Bounded recursion
  if (depth > 10) return '[DEPTH_EXCEEDED]';

  if (typeof arg === 'string') {
    return redactSecrets(arg);
  }

  if (arg instanceof Error) {
    // Preserve error prototype and custom properties while redacting messages
    const redactedMessage = redactSecrets(arg.message);
    const redactedStack = arg.stack ? redactSecrets(arg.stack) : undefined;

    // Create a proxy-like object or a shallow copy that redacts key properties
    const redactedError = Object.create(Object.getPrototypeOf(arg));
    Object.getOwnPropertyNames(arg).forEach((prop) => {
      const val = (arg as unknown as Record<string, unknown>)[prop];
      if (prop === 'message') {
        redactedError.message = redactedMessage;
      } else if (prop === 'stack') {
        redactedError.stack = redactedStack;
      } else {
        redactedError[prop] = redactAny(val, depth + 1, seen);
      }
    });
    return redactedError;
  }

  if (arg !== null && typeof arg === 'object') {
    if (seen.has(arg)) return '[CIRCULAR]';
    seen.add(arg);

    if (Array.isArray(arg)) {
      return arg.map((item) => redactAny(item, depth + 1, seen));
    }

    // Avoid redacting complex objects that aren't plain data
    const proto = Object.getPrototypeOf(arg);
    if (proto !== null && proto !== Object.prototype) {
      return arg;
    }

    const redactedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(arg)) {
      redactedObj[key] = redactAny(value, depth + 1, seen);
    }
    return redactedObj;
  }

  return arg;
}

/**
 * Safe console.log that redacts secrets.
 * Use instead of console.log for any output that might contain tokens.
 */
export function safeLog(...args: unknown[]): void {
  const redacted = args.map((arg) => redactAny(arg));
  // eslint-disable-next-line no-console
  console.log(...redacted);
}

/**
 * Safe console.error that redacts secrets.
 */
export function safeError(...args: unknown[]): void {
  const redacted = args.map((arg) => redactAny(arg));
  console.error(...redacted);
}

/**
 * Safe console.warn that redacts secrets.
 */
export function safeWarn(...args: unknown[]): void {
  const redacted = args.map((arg) => redactAny(arg));
  console.warn(...redacted);
}
