/**
 * Vitest setup: suppress unhandled rejections that leak from
 * dynamic import side effects in test environment (IndexedDB not available).
 */
process.on('unhandledRejection', () => {
  // Suppress - these are expected in jsdom without IndexedDB
});
