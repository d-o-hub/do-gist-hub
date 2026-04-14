/**
 * View Transitions Utility (2026)
 * Wrapper for View Transitions API with graceful fallback
 */

/**
 * Execute a DOM update with View Transition if supported
 */
export async function withViewTransition(updateFn: () => void | Promise<void>): Promise<void> {
  if (!('startViewTransition' in document)) {
    await updateFn();
    return;
  }

  // Type assertion for the experimental API
  const doc = document as Document & {
    startViewTransition?: (callback: () => void | Promise<void>) => {
      finished: Promise<void>;
    };
  };

  const transition = doc.startViewTransition!(updateFn);
  await transition.finished;
}

/**
 * Check if View Transitions API is supported
 */
export function isViewTransitionSupported(): boolean {
  return 'startViewTransition' in document;
}

/**
 * View transition names for consistent morphing
 */
export const viewTransitionNames = {
  gistCard: 'gist-card',
  gistDetail: 'gist-detail',
  gistList: 'gist-list',
  header: 'app-header',
} as const;
