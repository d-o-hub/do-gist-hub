/**
 * Vitest setup: suppress known benign unhandled rejections from
 * dynamic import side effects in test environment (IndexedDB not available).
 * Unexpected rejections are rethrown so real errors surface.
 */
const BENIGN_PATTERNS = [
  'indexeddb',
  'idbfactory',
  'failed to execute',
  'could not open database',
  'the database connection is closing',
  'transaction is not active',
];

process.on('unhandledRejection', (reason: unknown) => {
  const message =
    reason instanceof Error ? reason.message.toLowerCase() : String(reason).toLowerCase();
  const isBenign = BENIGN_PATTERNS.some((p) => message.includes(p));
  if (isBenign) {
    if (process.env.VERBOSE) {
      console.debug('[setup.ts] suppressed benign rejection:', reason);
    }
    return;
  }
  // Let unexpected rejections surface
  throw reason;
});
