/**
 * View Transitions Utility (2026)
 * Wrapper for View Transitions API with graceful fallback
 */

/**
 * Detect headless/automated browser environments where
 * startViewTransition may hang (compositor doesn't tick).
 */
function isAutomatedEnvironment(): boolean {
  return (
    // Playwright, Puppeteer, Selenium
    !!(window as { navigator?: { webdriver?: boolean } }).navigator?.webdriver ||
    // Headless Chrome/Firefox user agents
    /Headless/.test(navigator.userAgent) ||
    // Generic automation signal
    /(Chrome-Lighthouse|PTST)/.test(navigator.userAgent)
  );
}

/**
 * Execute a DOM update with View Transition if supported.
 * Skips transitions in headless/automated environments to prevent hangs.
 */
export async function withViewTransition(updateFn: () => void | Promise<void>): Promise<void> {
  if (!('startViewTransition' in document) || isAutomatedEnvironment()) {
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
