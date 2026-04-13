#!/usr/bin/env node
/**
 * Initialize design tokens
 * Generates CSS custom properties from token definitions
 * Usage: node scripts/init-design-tokens.js
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

console.log('🎨 Initializing design tokens...');

// Design token values (canonical source)
const tokens = {
  colors: {
    gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' },
    blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
    green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
    red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
    yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
  },
  spacing: [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96],
  breakpoints: { 'phone-small': '320px', phone: '390px', 'phone-large': '480px', 'tablet-portrait': '768px', 'tablet-landscape': '1024px', desktop: '1280px', 'desktop-wide': '1536px' },
};

// Generate CSS
const cssContent = `/* Auto-generated design tokens - DO NOT EDIT */
/* Run npm run init:design to regenerate */

:root {
  /* Colors - Light Theme */
  --color-background-primary: #ffffff;
  --color-background-secondary: ${tokens.colors.gray[50]};
  --color-background-tertiary: ${tokens.colors.gray[100]};
  --color-background-elevated: #ffffff;
  --color-foreground-primary: ${tokens.colors.gray[900]};
  --color-foreground-secondary: ${tokens.colors.gray[600]};
  --color-foreground-muted: ${tokens.colors.gray[500]};
  --color-foreground-inverse: #ffffff;
  --color-accent-primary: ${tokens.colors.blue[600]};
  --color-accent-hover: ${tokens.colors.blue[700]};
  --color-accent-active: ${tokens.colors.blue[800]};
  --color-accent-subtle: ${tokens.colors.blue[50]};
  --color-border-default: ${tokens.colors.gray[200]};
  --color-border-emphasis: ${tokens.colors.gray[400]};
  --color-border-strong: ${tokens.colors.gray[600]};
  --color-status-success-bg: ${tokens.colors.green[50]};
  --color-status-success-fg: ${tokens.colors.green[700]};
  --color-status-success-border: ${tokens.colors.green[200]};
  --color-status-error-bg: ${tokens.colors.red[50]};
  --color-status-error-fg: ${tokens.colors.red[700]};
  --color-status-error-border: ${tokens.colors.red[200]};
  --color-status-warning-bg: ${tokens.colors.yellow[50]};
  --color-status-warning-fg: ${tokens.colors.yellow[700]};
  --color-status-warning-border: ${tokens.colors.yellow[200]};
  --color-status-info-bg: ${tokens.colors.blue[50]};
  --color-status-info-fg: ${tokens.colors.blue[700]};
  --color-status-info-border: ${tokens.colors.blue[200]};
  --color-interactive-hover: ${tokens.colors.blue[700]};
  --color-interactive-active: ${tokens.colors.blue[600]};
  --color-interactive-focus: ${tokens.colors.blue[400]};

  /* Spacing */
  ${tokens.spacing.map((s, i) => `--spacing-${i}: ${s}px;`).join('\n  ')}

  /* Typography */
  --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'SF Mono', 'Fira Code', 'Fira Mono', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;

  /* Radius */
  --radius-none: 0px;
  --radius-sm: 0.25rem;
  --radius-base: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Motion */
  --motion-duration-fast: 150ms;
  --motion-duration-normal: 200ms;
  --motion-duration-slow: 300ms;
  --motion-easing-ease-out: cubic-bezier(0.16, 1, 0.3, 1);

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* Responsive container spacing */
  --spacing-container: 16px;
}

[data-theme="dark"] {
  --color-background-primary: #0d1117;
  --color-background-secondary: ${tokens.colors.gray[900]};
  --color-background-tertiary: ${tokens.colors.gray[800]};
  --color-background-elevated: ${tokens.colors.gray[800]};
  --color-foreground-primary: #f0f6fc;
  --color-foreground-secondary: ${tokens.colors.gray[300]};
  --color-foreground-muted: ${tokens.colors.gray[400]};
  --color-foreground-inverse: ${tokens.colors.gray[900]};
  --color-accent-primary: ${tokens.colors.blue[400]};
  --color-accent-hover: ${tokens.colors.blue[300]};
  --color-accent-active: ${tokens.colors.blue[200]};
  --color-accent-subtle: rgba(56, 139, 253, 0.15);
  --color-border-default: ${tokens.colors.gray[700]};
  --color-border-emphasis: ${tokens.colors.gray[500]};
  --color-border-strong: ${tokens.colors.gray[400]};
  --color-interactive-hover: ${tokens.colors.blue[300]};
  --color-interactive-active: ${tokens.colors.blue[400]};
  --color-interactive-focus: ${tokens.colors.blue[500]};
}

/* Responsive container spacing */
@media (min-width: ${tokens.breakpoints['phone-small']}) { :root { --spacing-container: 16px; } }
@media (min-width: ${tokens.breakpoints.phone}) { :root { --spacing-container: 16px; } }
@media (min-width: ${tokens.breakpoints['phone-large']}) { :root { --spacing-container: 20px; } }
@media (min-width: ${tokens.breakpoints['tablet-portrait']}) { :root { --spacing-container: 24px; } }
@media (min-width: ${tokens.breakpoints['tablet-landscape']}) { :root { --spacing-container: 32px; } }
@media (min-width: ${tokens.breakpoints.desktop}) { :root { --spacing-container: 40px; } }
@media (min-width: ${tokens.breakpoints['desktop-wide']}) { :root { --spacing-container: 48px; } }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-fast: 0ms;
    --motion-duration-normal: 0ms;
    --motion-duration-slow: 0ms;
  }
}
`;

try {
  writeFileSync(join(publicDir, 'design-tokens.css'), cssContent, 'utf-8');
  console.log('✅ Design tokens initialized successfully');
  console.log(`📁 Output: ${join(publicDir, 'design-tokens.css')}`);
} catch (error) {
  console.error('❌ Failed to initialize design tokens:', error.message);
  process.exit(1);
}
