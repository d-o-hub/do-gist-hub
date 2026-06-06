/**
 * Responsive Breakpoint Tokens
 * 7 breakpoints from mobile-first design
 */

import * as tokens from '../generated/tokens';

export const breakpoints = {
  'phone-small': tokens.BreakpointPhoneSmall,
  phone: tokens.BreakpointPhone,
  'phone-large': tokens.BreakpointPhoneLarge,
  'tablet-small': tokens.BreakpointTabletSmall,
  'tablet-portrait': tokens.BreakpointTabletPortrait,
  'tablet-landscape': tokens.BreakpointTabletLandscape,
  desktop: tokens.BreakpointDesktop,
  'desktop-wide': tokens.BreakpointDesktopWide,
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
 */
export const mediaQueries = {
  phoneSmall: `(min-width: ${tokens.BreakpointPhoneSmall})`,
  phone: `(min-width: ${tokens.BreakpointPhone})`,
  phoneLarge: `(min-width: ${tokens.BreakpointPhoneLarge})`,
  tabletSmall: `(min-width: ${tokens.BreakpointTabletSmall})`,
  tabletPortrait: `(min-width: ${tokens.BreakpointTabletPortrait})`,
  tabletLandscape: `(min-width: ${tokens.BreakpointTabletLandscape})`,
  desktop: `(min-width: ${tokens.BreakpointDesktop})`,
  desktopWide: `(min-width: ${tokens.BreakpointDesktopWide})`,

  // Max-width queries for narrow-viewport stacks.
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
  'phone-small': tokens.ContainerWidthPhoneSmall,
  phone: tokens.ContainerWidthPhone,
  'phone-large': tokens.ContainerWidthPhoneLarge,
  'tablet-small': tokens.ContainerWidthTabletSmall,
  'tablet-portrait': tokens.ContainerWidthTabletPortrait,
  'tablet-landscape': tokens.ContainerWidthTabletLandscape,
  desktop: tokens.ContainerWidthDesktop,
  'desktop-wide': tokens.ContainerWidthDesktopWide,
} as const;
