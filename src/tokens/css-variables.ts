/**
 * CSS Variables Generator
 * Converts design tokens into CSS custom properties
 * Refactored: Uses generated Style Dictionary variables.
 */

export function generateCSSVariables(): string {
  // We now import the generated tokens.css in base.css,
  // but for production build we still want a standalone file
  // that contains all theme-specific mappings.

  return `
:root {
  /* ===== Theme Color Scheme ===== */
  color-scheme: dark;

  /* ===== Color Primitives ===== */
  --color-black: var(--color-black);
  --color-white: var(--color-white);

  --color-gray-50: var(--color-gray-50);
  --color-gray-100: var(--color-gray-100);
  --color-gray-200: var(--color-gray-200);
  --color-gray-300: var(--color-gray-300);
  --color-gray-400: var(--color-gray-400);
  --color-gray-500: var(--color-gray-500);
  --color-gray-600: var(--color-gray-600);
  --color-gray-700: var(--color-gray-700);
  --color-gray-800: var(--color-gray-800);
  --color-gray-900: var(--color-gray-900);
  --color-gray-950: var(--color-gray-950);

  /* ===== Semantic Colors (Dark Mode) ===== */
  --color-background-primary: var(--semantic-dark-background-primary);
  --color-background-secondary: var(--semantic-dark-background-secondary);
  --color-background-tertiary: var(--semantic-dark-background-tertiary);
  --color-background-elevated: var(--semantic-dark-background-elevated);

  --color-foreground-primary: var(--semantic-dark-foreground-primary);
  --color-foreground-secondary: var(--semantic-dark-foreground-secondary);
  --color-foreground-muted: var(--semantic-dark-foreground-muted);
  --color-foreground-inverse: var(--semantic-dark-foreground-inverse);

  --color-accent-primary: var(--semantic-dark-accent-primary);
  --color-accent-hover: var(--semantic-dark-accent-hover);
  --color-accent-active: var(--semantic-dark-accent-active);
  --color-accent-subtle: var(--semantic-dark-accent-subtle);
  --color-accent-glow: var(--semantic-dark-accent-glow);

  --color-border-default: var(--semantic-dark-border-default);
  --color-border-emphasis: var(--semantic-dark-border-emphasis);
  --color-border-strong: var(--semantic-dark-border-strong);

  --color-status-success-bg: var(--semantic-dark-status-success-bg);
  --color-status-success-fg: var(--semantic-dark-status-success-fg);
  --color-status-success-border: var(--semantic-dark-status-success-border);

  --color-status-error-bg: var(--semantic-dark-status-error-bg);
  --color-status-error-fg: var(--semantic-dark-status-error-fg);
  --color-status-error-border: var(--semantic-dark-status-error-border);
  
  --color-status-warning-bg: var(--semantic-dark-status-warning-bg);
  --color-status-warning-fg: var(--semantic-dark-status-warning-fg);
  --color-status-warning-border: var(--semantic-dark-status-warning-border);
  
  --color-status-info-bg: var(--semantic-dark-status-info-bg);
  --color-status-info-fg: var(--semantic-dark-status-info-fg);
  --color-status-info-border: var(--semantic-dark-status-info-border);
  
  --color-interactive-hover: var(--semantic-dark-interactive-hover);
  --color-interactive-active: var(--semantic-dark-interactive-active);
  --color-interactive-focus: var(--semantic-dark-interactive-focus);
  
  /* ===== Spacing Tokens ===== */
  --spacing-0: var(--spacing-0);
  --spacing-0-5: var(--spacing-0-5);
  --spacing-1: var(--spacing-1);
  --spacing-1-5: var(--spacing-1-5);
  --spacing-2: var(--spacing-2);
  --spacing-2-5: var(--spacing-2-5);
  --spacing-3: var(--spacing-3);
  --spacing-4: var(--spacing-4);
  --spacing-5: var(--spacing-5);
  --spacing-6: var(--spacing-6);
  --spacing-7: var(--spacing-7);
  --spacing-8: var(--spacing-8);
  --spacing-9: var(--spacing-9);
  --spacing-10: var(--spacing-10);
  --spacing-11: var(--spacing-11);
  --spacing-12: var(--spacing-12);
  --spacing-14: var(--spacing-14);
  --spacing-15: var(--spacing-15);
  --spacing-16: var(--spacing-16);
  --spacing-20: var(--spacing-20);
  --spacing-24: var(--spacing-24);
  --spacing-28: var(--spacing-28);
  --spacing-32: var(--spacing-32);
  --spacing-36: var(--spacing-36);
  --spacing-40: var(--spacing-40);
  --spacing-44: var(--spacing-44);
  --spacing-48: var(--spacing-48);
  --spacing-50: var(--spacing-50);
  --spacing-52: var(--spacing-52);
  --spacing-56: var(--spacing-56);
  --spacing-60: var(--spacing-60);
  --spacing-64: var(--spacing-64);
  --spacing-72: var(--spacing-72);
  --spacing-80: var(--spacing-80);
  --spacing-96: var(--spacing-96);
  --spacing-100: var(--spacing-100);
  
  /* ===== Typography Tokens ===== */
  --font-family-sans: var(--font-family-sans);
  --font-family-serif: var(--font-family-serif);
  --font-family-mono: var(--font-family-mono);

  /* 2026: Semantic font aliases for self-hosted variable fonts (ADR-022) */
  --font-body: 'Inter Variable', var(--font-family-sans);
  --font-display: 'Anton', var(--font-family-sans);
  --font-mono: 'JetBrains Mono Variable', var(--font-family-mono);
  
  --font-size-xs: var(--font-size-xs);
  --font-size-sm: var(--font-size-sm);
  --font-size-base: var(--font-size-base);
  --font-size-lg: var(--font-size-lg);
  --font-size-xl: var(--font-size-xl);
  --font-size-2xl: var(--font-size-2xl);
  --font-size-3xl: var(--font-size-3xl);
  --font-size-4xl: var(--font-size-4xl);
  --font-size-5xl: var(--font-size-5xl);
  --font-size-6xl: var(--font-size-6xl);
  --font-size-7xl: var(--font-size-7xl);
  --font-size-8xl: var(--font-size-8xl);
  --font-size-9xl: var(--font-size-9xl);
  
  --font-weight-thin: var(--font-weight-thin);
  --font-weight-extralight: var(--font-weight-extralight);
  --font-weight-light: var(--font-weight-light);
  --font-weight-normal: var(--font-weight-normal);
  --font-weight-medium: var(--font-weight-medium);
  --font-weight-semibold: var(--font-weight-semibold);
  --font-weight-bold: var(--font-weight-bold);
  --font-weight-extrabold: var(--font-weight-extrabold);
  --font-weight-black: var(--font-weight-black);
  
  --line-height-none: var(--line-height-none);
  --line-height-tight: var(--line-height-tight);
  --line-height-snug: var(--line-height-snug);
  --line-height-normal: var(--line-height-normal);
  --line-height-relaxed: var(--line-height-relaxed);
  --line-height-loose: var(--line-height-loose);
  
  --letter-spacing-tighter: var(--letter-spacing-tighter);
  --letter-spacing-tight: var(--letter-spacing-tight);
  --letter-spacing-normal: var(--letter-spacing-normal);
  --letter-spacing-wide: var(--letter-spacing-wide);
  --letter-spacing-wider: var(--letter-spacing-wider);
  --letter-spacing-widest: var(--letter-spacing-widest);
  
  /* ===== Radius Tokens ===== */
  --radius-none: var(--radius-none);
  --radius-sm: var(--radius-sm);
  --radius-base: var(--radius-base);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --radius-2xl: var(--radius-2xl);
  --radius-3xl: var(--radius-3xl);
  --radius-full: var(--radius-full);
  
  /* ===== Motion Tokens (2026) ===== */
  --motion-duration-instant: var(--motion-duration-instant);
  --motion-duration-fast: var(--motion-duration-fast);
  --motion-duration-base: var(--motion-duration-normal);
  --motion-duration-normal: var(--motion-duration-normal);
  --motion-duration-slow: var(--motion-duration-slow);
  --motion-duration-deliberate: var(--motion-duration-deliberate);
  --motion-duration-pulse: 1.2s;

  --motion-easing-linear: var(--motion-easing-linear);
  --motion-easing-smooth: var(--motion-easing-smooth);
  --motion-easing-out: var(--motion-easing-out);
  --motion-easing-in: var(--motion-easing-in);
  --motion-easing-out-expo: var(--motion-easing-out-expo);
  --motion-easing-in-expo: var(--motion-easing-in-expo);
  --motion-easing-elastic: var(--motion-easing-elastic);
  --motion-easing-spring: var(--motion-easing-spring);

  /* Legacy aliases for backward compatibility */
  --motion-easing-ease-in-out: var(--motion-easing-smooth);
  --motion-easing-ease-out: var(--motion-easing-out);
  --motion-easing-ease-in: var(--motion-easing-in);
  --motion-duration-slower: var(--motion-duration-deliberate);
  
  /* ===== Shadow Tokens (Dark Mode Defaults) ===== */
  --shadow-none: var(--shadow-none);
  --shadow-sm: var(--shadow-sm-dark);
  --shadow-md: var(--shadow-md-dark);
  --shadow-lg: var(--shadow-lg-dark);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);
  --shadow-inner: var(--shadow-inner);
  --shadow-accent: 0 2px 8px var(--color-accent-glow);
  --shadow-accent-lg: 0 4px 16px var(--color-accent-glow);
  
  /* ===== Breakpoint Tokens ===== */
  --bp-phone-small: var(--breakpoint-phone-small);
  --bp-phone: var(--breakpoint-phone);
  --bp-phone-large: var(--breakpoint-phone-large);
  --bp-tablet-small: var(--breakpoint-tablet-small);
  --bp-tablet-portrait: var(--breakpoint-tablet-portrait);
  --bp-tablet-landscape: var(--breakpoint-tablet-landscape);
  --bp-desktop: var(--breakpoint-desktop);
  --bp-desktop-wide: var(--breakpoint-desktop-wide);

  /* ===== Component Tokens (2026) ===== */
  --nav-bottom-height: var(--nav-bottom-height);
  --nav-bottom-height-large: var(--nav-bottom-height-large);
  --nav-sidebar-width: var(--nav-sidebar-width);
  --nav-sidebar-width-large: var(--nav-sidebar-width-large);
  --nav-sidebar-width-wide: var(--nav-sidebar-width-wide);
  --nav-rail-width: var(--nav-rail-width);
  --nav-header-actions-gap: var(--nav-header-actions-gap);
  --nav-header-actions-gap-narrow: var(--nav-header-actions-gap-narrow);
  --nav-header-padding: var(--nav-header-padding);
  --nav-header-padding-narrow: var(--nav-header-padding-narrow);
  --ui-backdrop-bg: var(--ui-backdrop-background);
  --ui-backdrop-blur: var(--ui-backdrop-blur);
  --ui-glass-bg: var(--ui-glass-background);
  --ui-glass-border: var(--ui-glass-border);
  --gist-card-bg: var(--gist-card-background);
  --gist-card-shadow: var(--gist-card-shadow);

  /* ===== Legacy Aliases (backward compatibility) ===== */
  --color-bg: var(--color-background-primary);
  --color-text: var(--color-foreground-primary);
  --color-text-muted: var(--color-foreground-muted);
  --color-text-faint: var(--color-foreground-secondary);
  --color-accent: var(--color-accent-primary);
  --color-accent-text: var(--color-accent-primary);
  --color-surface: var(--color-background-secondary);
  --color-surface-2: var(--color-background-tertiary);
  --color-surface-elevated: var(--color-background-elevated);
  --color-border: var(--color-border-default);
  --color-divider: var(--color-border-default);
  --color-error: var(--color-status-error-fg);
  --color-warning: var(--color-status-warning-fg);
  --color-success: var(--color-status-success-fg);
  --glass-border: 1px solid var(--color-border-default);
  --glass-shadow: var(--shadow-md);
  --radius-card: var(--radius-xl);

  /* ===== Surface & Overlay Tokens ===== */
  --color-surface-overlay: var(--semantic-dark-overlay-surface);
  --color-surface-overlay-medium: var(--semantic-dark-overlay-surface-medium);
  --color-surface-overlay-heavy: var(--semantic-dark-overlay-surface-heavy);
  --color-surface-overlay-light: var(--semantic-dark-overlay-surface-light);
  --color-backdrop-medium: var(--semantic-dark-overlay-backdrop-medium);
  --color-backdrop-heavy: var(--semantic-dark-overlay-backdrop-heavy);
  --color-nav-bg: var(--semantic-dark-nav-bg);
  --color-header-bg: var(--semantic-dark-header-bg);
  --color-modal-bg: var(--semantic-dark-modal-bg);
  --color-border-hover: var(--semantic-dark-border-hover);
  --color-status-error-subtle: var(--semantic-dark-status-error-subtle);
  --color-status-success-subtle: var(--semantic-dark-status-success-subtle);

  /* ===== Skeleton Tokens ===== */
  --skeleton-shimmer-start: var(--semantic-dark-skeleton-shimmer-start);
  --skeleton-shimmer-mid: var(--semantic-dark-skeleton-shimmer-mid);

  /* ===== Component Shadow Tokens ===== */
  --shadow-command-palette: 0 24px 48px oklch(0 0 0 / 0.5), 0 0 0 1px oklch(1 0 0 / 0.05);
  --shadow-glass-hover: 0 0 60px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(1 0 0 / 0.1);
}

/* ===== OKLCH Shadow Ramp (Enhanced browsers) ===== */
@supports (color: oklch(0 0 0)) {
  :root {
    --shadow-xs: var(--shadow-oklch-xs);
    --shadow-sm: var(--shadow-oklch-sm);
    --shadow-md: var(--shadow-oklch-md);
    --shadow-lg: var(--shadow-oklch-lg);
    --shadow-xl: var(--shadow-oklch-xl);
    --shadow-2xl: var(--shadow-oklch-2xl);
  }
}

/* ===== Light Theme Override ===== */
[data-theme="light"] {
  color-scheme: light;
  --color-background-primary: var(--semantic-light-background-primary);
  --color-background-secondary: var(--semantic-light-background-secondary);
  --color-background-tertiary: var(--semantic-light-background-tertiary);
  --color-background-elevated: var(--semantic-light-background-elevated);

  --color-foreground-primary: var(--semantic-light-foreground-primary);
  --color-foreground-secondary: var(--semantic-light-foreground-secondary);
  --color-foreground-muted: var(--semantic-light-foreground-muted);
  --color-foreground-inverse: var(--semantic-light-foreground-inverse);

  --color-accent-primary: var(--semantic-light-accent-primary);
  --color-accent-hover: var(--semantic-light-accent-hover);
  --color-accent-active: var(--semantic-light-accent-active);
  --color-accent-subtle: var(--semantic-light-accent-subtle);
  --color-accent-glow: var(--semantic-light-accent-glow);

  --color-border-default: var(--semantic-light-border-default);
  --color-border-emphasis: var(--semantic-light-border-emphasis);
  --color-border-strong: var(--semantic-light-border-strong);

  --color-status-success-bg: var(--semantic-light-status-success-bg);
  --color-status-success-fg: var(--semantic-light-status-success-fg);
  --color-status-success-border: var(--semantic-light-status-success-border);

  --color-status-error-bg: var(--semantic-light-status-error-bg);
  --color-status-error-fg: var(--semantic-light-status-error-fg);
  --color-status-error-border: var(--semantic-light-status-error-border);

  --color-status-warning-bg: var(--semantic-light-status-warning-bg);
  --color-status-warning-fg: var(--semantic-light-status-warning-fg);
  --color-status-warning-border: var(--semantic-light-status-warning-border);

  --color-status-info-bg: var(--semantic-light-status-info-bg);
  --color-status-info-fg: var(--semantic-light-status-info-fg);
  --color-status-info-border: var(--semantic-light-status-info-border);

  --color-interactive-hover: var(--semantic-light-interactive-hover);
  --color-interactive-active: var(--semantic-light-interactive-active);
  --color-interactive-focus: var(--semantic-light-interactive-focus);

  /* Light mode shadows */
  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);

  /* Light mode component shadows (OKLCH fallbacks for light bg) */
  --shadow-command-palette: 0 24px 48px oklch(0 0 0 / 0.15), 0 0 0 1px oklch(0 0 0 / 0.06);
  --shadow-glass-hover: 0 0 60px oklch(0 0 0 / 0.15), 0 0 0 1px oklch(0 0 0 / 0.08);

  /* Light mode glass effects */
  --ui-backdrop-bg: var(--semantic-light-nav-bg);
  --ui-glass-bg: rgba(0, 0, 0, 0.03);
  --ui-glass-border: rgba(0, 0, 0, 0.08);

  /* Light mode surface & overlay */
  --color-surface-overlay: var(--semantic-light-overlay-surface);
  --color-surface-overlay-medium: var(--semantic-light-overlay-surface-medium);
  --color-surface-overlay-heavy: var(--semantic-light-overlay-surface-heavy);
  --color-surface-overlay-light: var(--semantic-light-overlay-surface-light);
  --color-backdrop-medium: var(--semantic-light-overlay-backdrop-medium);
  --color-backdrop-heavy: var(--semantic-light-overlay-backdrop-heavy);
  --color-nav-bg: var(--semantic-light-nav-bg);
  --color-header-bg: var(--semantic-light-header-bg);
  --color-modal-bg: var(--semantic-light-modal-bg);
  --color-border-hover: var(--semantic-light-border-hover);
  --color-status-error-subtle: var(--semantic-light-status-error-subtle);
  --color-status-success-subtle: var(--semantic-light-status-success-subtle);
  --skeleton-shimmer-start: var(--semantic-light-skeleton-shimmer-start);
  --skeleton-shimmer-mid: var(--semantic-light-skeleton-shimmer-mid);
}

/* Light mode OKLCH shadows */
@supports (color: oklch(0 0 0)) {
  [data-theme="light"] {
    --shadow-xs: var(--shadow-oklch-xs-light);
    --shadow-sm: var(--shadow-oklch-sm-light);
    --shadow-md: var(--shadow-oklch-md-light);
    --shadow-lg: var(--shadow-oklch-lg-light);
    --shadow-xl: var(--shadow-oklch-xl-light);
    --shadow-2xl: var(--shadow-oklch-2xl-light);
  }
}

/* ===== Responsive Container Spacing ===== */
@media (min-width: 320px) {
  :root {
    --spacing-container: var(--spacing-4);
  }
}

@media (min-width: 390px) {
  :root {
    --spacing-container: var(--spacing-4);
  }
}

@media (min-width: 480px) {
  :root {
    --spacing-container: var(--spacing-5);
  }
}

@media (min-width: 640px) {
  :root {
    --spacing-container: var(--spacing-5);
  }
}

@media (min-width: 768px) {
  :root {
    --spacing-container: var(--spacing-6);
  }
}

@media (min-width: 1024px) {
  :root {
    --spacing-container: var(--spacing-8);
  }
}

@media (min-width: 1280px) {
  :root {
    --spacing-container: var(--spacing-10);
  }
}

@media (min-width: 1536px) {
  :root {
    --spacing-container: var(--spacing-12);
  }
}

/* ===== Reduced Motion (2026) ===== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  :root {
    --motion-duration-instant: 0ms;
    --motion-duration-fast: 0ms;
    --motion-duration-normal: 0ms;
    --motion-duration-slow: 0ms;
    --motion-duration-deliberate: 0ms;
    --motion-duration-slower: 0ms;
  }
}

/* ===== High Contrast Mode Support ===== */
@media (prefers-contrast: high) {
  :root {
    --color-border-default: currentColor;
    --color-border-emphasis: currentColor;
  }
}
`;
}
