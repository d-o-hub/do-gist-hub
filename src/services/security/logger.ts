import { openDB, IDBPDatabase, DBSchema } from 'idb';

/**
 * Logger Service with Redaction
 * Automatically redacts GitHub Personal Access Tokens and other secrets.
 */

export interface LogEntry {
  id?: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

interface LogDBSchema extends DBSchema {
  logs: {
    key: number;
    value: LogEntry;
  };
}

const DB_NAME = 'gist-hub-logs';
const STORE_NAME = 'logs';

/**
 * Initialize logs database.
 */
async function getLogDB(): Promise<IDBPDatabase<LogDBSchema>> {
  return openDB<LogDBSchema>(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

/**
 * Redact GitHub PATs and other secrets from strings.
 */
export function redactSecrets(text: string): string {
  if (typeof text !== 'string') return text;
  // GitHub PAT regex (fine-grained and classic)
  return text
    .replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_TOKEN]')
    .replace(/github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g, '[REDACTED_TOKEN]');
}

/**
 * Deeply redact secrets from objects and arrays.
 */
export function redactAny(data: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 5) return '[DEPTH_LIMIT_REDACTED]';

  if (typeof data === 'string') {
    return redactSecrets(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactAny(item, depth + 1));
  }

  if (data !== null && typeof data === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Redact specific keys that often contain secrets
      if (['token', 'password', 'secret', 'authorization'].includes(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactAny(value, depth + 1);
      }
    }
    return redacted;
  }

  return data;
}

/**
 * Persist log entry to IndexedDB.
 */
async function persistLog(
  level: LogEntry['level'],
  message: string,
  data?: unknown
): Promise<void> {
  try {
    const db = await getLogDB();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: redactAny(data),
    };

    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.objectStore(STORE_NAME).add(entry);
  } catch (err) {
    // Fallback to console if DB fails
    // skipcq: JS-C1003
    console.error('Failed to persist log:', err);
  }
}

/**
 * Safe console.log that redacts secrets and persists offline.
 */
export function safeLog(message: string, ...args: unknown[]): void {
  const redactedArgs = args.map((arg) => redactAny(arg));
  const redactedMessage = redactSecrets(message);

  /* eslint-disable no-console */
  console.log(redactedMessage, ...redactedArgs);

  void persistLog('info', redactedMessage, args.length === 1 ? args[0] : args);
}

/**
 * Safe console.error that redacts secrets and persists offline.
 */
export function safeError(message: string, ...args: unknown[]): void {
  const redactedArgs = args.map((arg) => redactAny(arg));
  const redactedMessage = redactSecrets(message);

  /* eslint-disable no-console */
  console.error(redactedMessage, ...redactedArgs);

  void persistLog('error', redactedMessage, args.length === 1 ? args[0] : args);
}

/**
 * Safe console.warn that redacts secrets and persists offline.
 */
export function safeWarn(message: string, ...args: unknown[]): void {
  const redactedArgs = args.map((arg) => redactAny(arg));
  const redactedMessage = redactSecrets(message);

  /* eslint-disable no-console */
  console.warn(redactedMessage, ...redactedArgs);

  void persistLog('warn', redactedMessage, args.length === 1 ? args[0] : args);
}

/**
 * Get all logs from IndexedDB.
 */
export async function getOfflineLogs(): Promise<LogEntry[]> {
  const db = await getLogDB();
  return db.getAll(STORE_NAME);
}

/**
 * Clear all logs.
 */
export async function clearLogs(): Promise<void> {
  const db = await getLogDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
}

export { redactSecrets as redactToken };
