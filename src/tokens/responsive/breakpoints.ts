/**
 * Responsive Breakpoint Tokens
 * 7 breakpoints from mobile-first design
 *
 * Boundaries follow the rule "content pressure, then change":
 *   320  phone-small       — iPhone SE, narrowest target
 *   390  phone             — modern iPhone baseline
 *   480  phone-large       — large phones, last narrow column layout
 *   640  tablet-small      — small tablets, phone landscape
 *   768  tablet-portrait   — iPad portrait, nav rail starts
 *   1024 tablet-landscape  — iPad landscape, sidebar starts
 *   1280 desktop           — laptop, three-column gist grid
 *   1536 desktop-wide      — ultrawide, max container width
 */

export const breakpoints = {
  'phone-small': '320px',
  phone: '390px',
  'phone-large': '480px',
  'tablet-small': '640px',
  'tablet-portrait': '768px',
  'tablet-landscape': '1024px',
  desktop: '1280px',
  'desktop-wide': '1536px',
} as const;

/**
 * Numeric breakpoint values (px) for JS-side comparison
 * and container query sizing.
 */
export const breakpointPx = {
  'phone-small': 320,
  phone: 390,
  'phone-large': 480,
  'tablet-small': 640,
  'tablet-portrait': 768,
  'tablet-landscape': 1024,
  desktop: 1280,
  'desktop-wide': 1536,
} as const;

/**
 * Pre-baked `min-width` / `max-width` media query strings.
 *
 * Use these to avoid stringly-typed media queries in CSS files.
 * Both directions are exposed so narrow-viewport stacks (e.g. ≤480px)
 * and wide-viewport expansions (e.g. ≥768px) stay consistent.
 */
export const mediaQueries = {
  phoneSmall: '(min-width: 320px)',
  phone: '(min-width: 390px)',
  phoneLarge: '(min-width: 480px)',
  tabletSmall: '(min-width: 640px)',
  tabletPortrait: '(min-width: 768px)',
  tabletLandscape: '(min-width: 1024px)',
  desktop: '(min-width: 1280px)',
  desktopWide: '(min-width: 1536px)',

  // Max-width queries for narrow-viewport stacks.
  // These use the "boundary - 0.02px" trick to avoid overlap with
  // the matching min-width query at the same breakpoint.
  upToPhone: '(max-width: 389.98px)',
  upToPhoneLarge: '(max-width: 479.98px)',
  upToTablet: '(max-width: 767.98px)',
  upToTabletLandscape: '(max-width: 1023.98px)',

  // Pointer / hover capability queries for input-mode adaptations.
  hover: '(hover: hover)',
  coarsePointer: '(pointer: coarse)',
  noHoverCoarse: '(hover: none) and (pointer: coarse)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: high)',
  forcedColors: '(forced-colors: active)',
} as const;

/**
 * Responsive Container Widths
 */
export const containerWidths = {
  'phone-small': '100%',
  phone: '100%',
  'phone-large': '100%',
  'tablet-small': '600px',
  'tablet-portrait': '720px',
  'tablet-landscape': '960px',
  desktop: '1200px',
  'desktop-wide': '1440px',
} as const;
