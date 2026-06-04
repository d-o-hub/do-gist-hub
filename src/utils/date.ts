/**
 * Date Utilities
 * Centralized date parsing and relative time formatting with shared caching.
 */

// BOLT: Shared cache for parsed timestamps to maximize efficiency across the app
const timestampCache = new Map<string, number>();

/**
 * Parse an ISO date string into a numeric timestamp, with caching.
 * BOLT: Reduces Date.parse overhead to O(N) across all components and renders.
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
 * Format an ISO date string as a relative time (e.g., "5M AGO").
 * BOLT: Leverages cached timestamps and avoids repeated Date object instantiation.
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const dateTs = parseIsoDate(dateStr);

  if (Number.isNaN(dateTs)) return '';

  const diffMs = now - dateTs;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'JUST NOW';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}M AGO`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}H AGO`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}D AGO`;
}
