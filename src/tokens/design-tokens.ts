import { safeLog } from '../services/security/logger';
/**
 * Design Token System Initialization
 * Injects CSS custom properties into the document
 */

import { generateCSSVariables } from './css-variables';

let tokensLink: HTMLLinkElement | null = null;

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
 * Update theme (light/dark)
 */
export function setTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);

  // Persist preference
  localStorage.setItem('theme-preference', theme);
}

/**
 * Get current theme
 */
export function getTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem('theme-preference') as 'light' | 'dark' | null;

  if (stored) {
    return stored;
  }

  // Fall back to system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

/**
 * Initialize theme from stored preference or system setting
 */
export function initTheme(): void {
  const theme = getTheme();
  setTheme(theme);
}
