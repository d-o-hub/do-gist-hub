/**
 * Date Utilities (2026)
 * Optimized for performance and cache efficiency.
 */

/**
 * Global cache for parsed timestamps.
 * ⚡ Bolt: Consolidating caches across the app reduces memory overhead
 * and maximizes sorting/rendering efficiency by avoiding redundant Date.parse calls.
 */
const timestampCache = new Map<string, number>();

/**
 * High-performance ISO date parser with persistent caching.
 * Reduces O(N log N) sorting costs and repeated rendering lookups.
 */
export function parseIsoDate(dateStr: string): number {
  if (!dateStr) return Number.NaN;
  let ts = timestampCache.get(dateStr);
  if (ts === undefined) {
    ts = Date.parse(dateStr);
    timestampCache.set(dateStr, ts);
  }
  return ts;
}

/**
 * High-performance relative time formatter.
 * ⚡ Bolt: Uses cached timestamps and Date.now() to avoid Date object instantiation.
 */
export function formatRelativeTime(dateStr: string, style: 'short' | 'long' = 'short'): string {
  const now = Date.now();
  const dateTs = parseIsoDate(dateStr);

  if (Number.isNaN(dateTs)) return '';

  const diffMs = now - dateTs;
  const diffSec = Math.floor(diffMs / 1000);

  if (style === 'short') {
    // Style used in Gist Cards (Neural Telemetry style)
    if (diffSec < 60) return 'JUST NOW';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}M AGO`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}H AGO`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}D AGO`;
  }

  // Style used in Gist Detail
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
