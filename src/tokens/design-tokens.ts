import { safeLog } from '../services/security/logger';
/**
 * Design Token System Initialization
 * Injects CSS custom properties into the document
 */

import { generateCSSVariables } from './css-variables';

let tokensLink: HTMLLinkElement | null = null;
let themeIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize design tokens by linking a blob URL stylesheet.
 * Avoids inline styles to comply with strict CSP (no unsafe-inline).
 */
export function initDesignTokens(): void {
  if (tokensLink) {
    return;
  }

  const css = generateCSSVariables();
  const blob = new Blob([css], { type: 'text/css' });
  const url = URL.createObjectURL(blob);

  tokensLink = document.createElement('link');
  tokensLink.rel = 'stylesheet';
  tokensLink.href = url;
  tokensLink.id = 'design-tokens';

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
export function resolveTheme(preference: 'light' | 'dark' | 'time' | null): 'light' | 'dark' {
  if (preference === 'time') {
    return resolveTimeBasedTheme();
  }

  if (preference) {
    return preference;
  }

  // Fall back to system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function clearThemeInterval(): void {
  if (themeIntervalId) {
    clearInterval(themeIntervalId);
    themeIntervalId = null;
  }
}

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
 * Update theme (light/dark/time)
 */
export function setTheme(theme: 'light' | 'dark' | 'time'): void {
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolved);

  // Persist the raw preference (including 'time')
  localStorage.setItem('theme-preference', theme);

  // Manage re-evaluation interval based on mode
  if (theme === 'time') {
    startTimeBasedInterval();
  } else {
    clearThemeInterval();
  }
}

/**
 * Get stored theme preference (may be 'time')
 */
export function getThemePreference(): 'light' | 'dark' | 'time' | null {
  return localStorage.getItem('theme-preference') as 'light' | 'dark' | 'time' | null;
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

  // Manage interval based on stored preference
  if (preference === 'time') {
    startTimeBasedInterval();
  } else {
    clearThemeInterval();
  }
}
