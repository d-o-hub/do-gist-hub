/**
 * Design Token System Initialization
 * Injects CSS custom properties into the document
 */

import { generateCSSVariables } from './css-variables';

let styleElement: HTMLStyleElement | null = null;

/**
 * Initialize design tokens by injecting CSS variables
 */
export function initDesignTokens(): void {
  // Check if already initialized
  if (styleElement) {
    return;
  }

  // Create style element
  styleElement = document.createElement('style');
  styleElement.id = 'design-tokens';
  styleElement.textContent = generateCSSVariables();

  // Inject into document head
  document.head.appendChild(styleElement);

  console.log('[Design Tokens] Initialized');
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
