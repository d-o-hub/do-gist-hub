export function redactToken(t: string): string {
  return t.length > 10 ? t.slice(0, 6) + '...' : '[REDACTED]';
}
export function redactSecrets(input: string): string {
  if (!input) return input;
  return input
    .replace(/(ghp_[A-Za-z0-9_]{36,})/g, '[REDACTED]')
    .replace(/(github_pat_[A-Za-z0-9_]{82,})/g, '[REDACTED]');
}
export function redactAny(item: unknown, seen = new WeakSet()): unknown {
  if (typeof item === 'string') return redactSecrets(item);
  if (item && typeof item === 'object') {
    if (seen.has(item as object)) return '[CIRCULAR]';
    seen.add(item as object);
    if (Array.isArray(item)) return item.map((v) => redactAny(v, seen));
    if (item instanceof Error) {
      const e = new Error(redactSecrets(item.message));
      e.stack = item.stack ? redactSecrets(item.stack) : undefined;
      return e;
    }
    const r: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(item as Record<string, unknown>)) r[k] = redactAny(v, seen);
    return r;
  }
  return item;
}
export function safeLog(m: string, ...a: unknown[]): void {
  // eslint-disable-next-line no-console
  console.info(`[INFO] ${redactSecrets(m)}`, ...a.map((x) => redactAny(x)));
}
export function safeError(m: string, ...a: unknown[]): void {
  console.error(`[ERROR] ${redactSecrets(m)}`, ...a.map((x) => redactAny(x)));
}
export function safeWarn(m: string, ...a: unknown[]): void {
  console.warn(`[WARN] ${redactSecrets(m)}`, ...a.map((x) => redactAny(x)));
}
