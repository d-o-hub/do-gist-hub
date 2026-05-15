/**
 * Design Token System Initialization
 * Injects CSS custom properties into the document
 */

import { safeLog } from '../services/security/logger';
import { generateCSSVariables } from './css-variables';

let tokensLink: HTMLLinkElement | null = null;
let themeIntervalId: ReturnType<typeof setInterval> | null = null;
let ambientInitAttempted = false;

/**
 * Initialize design tokens by linking a stylesheet.
 *
 * - Production: uses build-time generated static /design-tokens.css (no blob URL needed).
 * - Development: uses runtime blob URL for HMR compatibility.
 *
 * Avoids inline styles to comply with strict CSP (no unsafe-inline).
 */
export function initDesignTokens(): void {
  if (tokensLink) {
    return;
  }

  tokensLink = document.createElement('link');
  tokensLink.rel = 'stylesheet';
  tokensLink.id = 'design-tokens';

  if (import.meta.env.DEV) {
    // Dev: use blob URL for HMR compatibility
    const css = generateCSSVariables();
    const blob = new Blob([css], { type: 'text/css' });
    tokensLink.href = URL.createObjectURL(blob);
  } else {
    // Prod: use build-time generated static CSS file
    tokensLink.href = '/design-tokens.css';
  }

  document.head.appendChild(tokensLink);

  safeLog('[Design Tokens] Initialized');
}

/**
 * Resolve time-based theme preference to actual light/dark value.
 * Dark between 19:00 (7 PM) and 07:00 (7 AM).
 */
export function resolveTimeBasedTheme(): 'light' | 'dark' {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7 ? 'dark' : 'light';
}

/**
 * Resolve any stored preference to the actual light/dark theme to apply.
 */
export function resolveTheme(
  preference: 'light' | 'dark' | 'time' | 'ambient' | null
): 'light' | 'dark' {
  if (preference === 'time') {
    return resolveTimeBasedTheme();
  }

  if (preference === 'ambient') {
    return 'dark';
  }

  if (preference) {
    return preference;
  }

  // Fall back to system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'dark';
}

/**
 * Clear the active time-based theme re-evaluation interval.
 */
function clearThemeInterval(): void {
  if (themeIntervalId) {
    clearInterval(themeIntervalId);
    themeIntervalId = null;
  }
}

/**
 * Start a periodic interval to re-evaluate the time-based theme.
 * Clears any existing interval first to prevent duplicates.
 */
function startTimeBasedInterval(): void {
  clearThemeInterval();
  themeIntervalId = setInterval(() => {
    const current = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
    const next = resolveTimeBasedTheme();
    if (current !== next) {
      document.documentElement.setAttribute('data-theme', next);
      window.dispatchEvent(new CustomEvent('app:theme-change', { detail: { theme: next } }));
    }
  }, 900_000);
}

/**
 * Clean up the theme system by clearing any active interval.
 * Should be called on page unload or route teardown.
 */
export function cleanupThemeSystem(): void {
  clearThemeInterval();
}

/**
 * Apply and persist a theme preference.
 * Ambient mode is started by the settings route on user selection;
 * initTheme() also restarts the sensor on page reload via dynamic import.
 */
export function setTheme(theme: 'light' | 'dark' | 'time' | 'ambient'): void {
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolved);

  // Persist the raw preference (including 'time')
  localStorage.setItem('theme-preference', theme);

  // Manage re-evaluation interval based on mode
  if (theme === 'time') {
    startTimeBasedInterval();
  } else {
    clearThemeInterval();
    if (theme !== 'ambient') {
      // Reset one-shot guard when leaving ambient mode so a future
      // initTheme() or manual selection can re-attempt sensor startup.
      ambientInitAttempted = false;
    }
  }
}

/**
 * Get stored theme preference from localStorage.
 * Validates the stored value against known valid preferences.
 * Returns null for invalid or missing values (including legacy 'auto').
 */
export function getThemePreference(): 'light' | 'dark' | 'time' | 'ambient' | null {
  const raw = localStorage.getItem('theme-preference');
  if (raw === 'light' || raw === 'dark' || raw === 'time' || raw === 'ambient') {
    return raw;
  }
  return null;
}

/**
 * Get current resolved theme (always light or dark)
 */
export function getTheme(): 'light' | 'dark' {
  return resolveTheme(getThemePreference());
}

/**
 * Initialize theme from stored preference or system setting.
 * Sets up a periodic re-evaluation timer when time-based mode is active.
 */
export function initTheme(): void {
  const preference = getThemePreference();
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute('data-theme', resolved);

  // Manage interval / sensor based on stored preference
  if (preference === 'time') {
    startTimeBasedInterval();
  } else {
    clearThemeInterval();
    if (preference === 'ambient') {
      // Dynamically import to avoid circular dependency with UI layer.
      // Guard with a one-shot flag so a broken sensor does not loop.
      if (!ambientInitAttempted) {
        ambientInitAttempted = true;
        void import('../components/ui/ambient-light').then(({ startAmbientLightSensor }) => {
          void startAmbientLightSensor();
        });
      }
    }
  }
}
