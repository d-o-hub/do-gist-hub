export function safeLog(message: string, ...args: unknown[]): void {
  console.log(`[INFO] ${message}`, ...args);
}
export function safeError(message: string, ...args: unknown[]): void {
  console.error(`[ERROR] ${message}`, ...args);
}
export function safeWarn(message: string, ...args: unknown[]): void {
  console.warn(`[WARN] ${message}`, ...args);
}
export function redactToken(t: string): string { return t.length > 10 ? t.slice(0,6) + '...' : '[REDACTED]'; }
export function redactSecrets(input: string): string { return input ? input.replace(/(ghp_[A-Za-z0-9_]{36,})/g, '[REDACTED]') : input; }
