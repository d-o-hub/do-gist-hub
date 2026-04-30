/**
 * View Transitions Utility (2026)
 * Wrapper for View Transitions API with graceful fallback
 */

/**
 * Detect if running in an automated test environment (Playwright, Puppeteer, etc.)
 * View transitions can hang in headless/composited environments where the animation
 * frame loop does not tick normally.
 */
function isAutomatedEnvironment(): boolean {
  return Boolean(
    (navigator as Navigator & { webdriver?: boolean }).webdriver ||
    /HeadlessChrome/.test(navigator.userAgent) ||
    /PhantomJS/.test(navigator.userAgent)
  );
}

/**
 * Execute a DOM update with View Transition if supported
 */
export async function withViewTransition(updateFn: () => void | Promise<void>): Promise<void> {
  if (!('startViewTransition' in document)) {
    await updateFn();
    return;
  }

  // Skip view transitions in automated testing to prevent hangs
  // where transition.finished never resolves in headless mode
  if (isAutomatedEnvironment()) {
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
