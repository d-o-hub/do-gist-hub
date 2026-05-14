/**
 * Secure logging utility with token redaction and offline persistence.
 * Ensures PATs and other secrets are never exposed in logs.
 * Persists logs to IndexedDB for offline diagnostics.
 */

import { getDB, isDBReady, type LogEntry } from '../db';

/**
 * Redact a token, unconditionally returning '[REDACTED]'.
 * Never reveals partial token content.
 */
export function redactToken(_token: string): string {
  return '[REDACTED]';
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
    if (seen.has(arg)) return '[CIRCULAR]';
    seen.add(arg);

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

    const redactedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(arg)) {
      redactedObj[key] = redactAny(value, depth + 1, seen);
    }
    return redactedObj;
  }

  return arg;
}

const MAX_LOGS = 1000;

/**
 * Persist log entry to IndexedDB with rotation.
 */
export async function persistLog(
  level: LogEntry['level'],
  message: string,
  data?: unknown
): Promise<void> {
  // Avoid circular dependency: if DB is being initialized (upgrade in progress),
  // skip persistence to prevent getDB() from throwing before dbInstance is set.
  if (!isDBReady()) return;

  try {
    const db = getDB();

    await db.add('logs', {
      timestamp: Date.now(),
      level,
      message,
      data: redactAny(data),
    });

    // Rotation: remove old logs if exceeding limit
    const count = await db.count('logs');
    if (count > MAX_LOGS) {
      const logs = await db.getAllKeysFromIndex('logs', 'by-timestamp');
      const toDelete = logs.slice(0, count - MAX_LOGS);
      const tx = db.transaction('logs', 'readwrite');
      for (const id of toDelete) {
        void tx.objectStore('logs').delete(id);
      }
      await tx.done;
    }
  } catch (err) {
    // Fallback if DB not ready or failed
    console.error('[Logger] Failed to persist log', err);
  }
}

/**
 * Safe console.log that redacts secrets and persists offline.
 */
export function safeLog(message: string, ...args: unknown[]): void {
  const redactedArgs = args.map((arg) => redactAny(arg));
  const redactedMessage = redactSecrets(message);

  void persistLog(
    'info',
    redactedMessage,
    redactedArgs.length === 1 ? redactedArgs[0] : redactedArgs
  );
}

/**
 * Safe console.error that redacts secrets and persists offline.
 */
export function safeError(message: string, ...args: unknown[]): void {
  const redactedArgs = args.map((arg) => redactAny(arg));
  const redactedMessage = redactSecrets(message);

  console.error(redactedMessage, ...redactedArgs);

  void persistLog(
    'error',
    redactedMessage,
    redactedArgs.length === 1 ? redactedArgs[0] : redactedArgs
  );
}

/**
 * Safe console.warn that redacts secrets and persists offline.
 */
export function safeWarn(message: string, ...args: unknown[]): void {
  const redactedArgs = args.map((arg) => redactAny(arg));
  const redactedMessage = redactSecrets(message);

  console.warn(redactedMessage, ...redactedArgs);

  void persistLog(
    'warn',
    redactedMessage,
    redactedArgs.length === 1 ? redactedArgs[0] : redactedArgs
  );
}

/**
 * Get all logs from IndexedDB.
 */
export function getOfflineLogs(): Promise<LogEntry[]> {
  const db = getDB();
  return db.getAllFromIndex('logs', 'by-timestamp');
}

/**
 * Clear all logs from IndexedDB.
 */
export async function clearOfflineLogs(): Promise<void> {
  const db = getDB();
  await db.clear('logs');
}
