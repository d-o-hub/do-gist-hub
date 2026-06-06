/**
 * Elevation Tokens
 * Shadow and z-index values for layering
 * 2026 Update: Added accent glows and refined layering
 */

import * as tokens from '../generated/tokens';

export const shadowTokens = {
  none: tokens.ShadowNone,
  sm: tokens.ShadowSm,
  md: tokens.ShadowMd,
  lg: tokens.ShadowLg,
  xl: tokens.ShadowXl,
  '2xl': tokens.Shadow2xl,
  accent: '0 2px 8px var(--color-accent-glow)',
  accentLg: '0 4px 16px var(--color-accent-glow)',
  inner: tokens.ShadowInner,
  // 2026: Tonal shadows for dark mode (lighter, subtler)
  'sm-dark': tokens.ShadowSmDark,
  'md-dark': tokens.ShadowMdDark,
  'lg-dark': tokens.ShadowLgDark,
} as const;

/**
 * OKLCH shadow values for @supports (color: oklch) block.
 * Single source of truth — replaces hand-authored CSS in base.css.
 */
export const shadowOklch = {
  xs: tokens.ShadowOklchXs,
  sm: tokens.ShadowOklchSm,
  md: tokens.ShadowOklchMd,
  lg: tokens.ShadowOklchLg,
  xl: tokens.ShadowOklchXl,
  '2xl': tokens.ShadowOklch2xl,
  'xs-light': tokens.ShadowOklchXsLight,
  'sm-light': tokens.ShadowOklchSmLight,
  'md-light': tokens.ShadowOklchMdLight,
  'lg-light': tokens.ShadowOklchLgLight,
  'xl-light': tokens.ShadowOklchXlLight,
  '2xl-light': tokens.ShadowOklch2xlLight,
} as const;

export const zIndex = {
  hide: String(tokens.ZIndexHide),
  base: String(tokens.ZIndexBase),
  dropdown: String(tokens.ZIndexDropdown),
  sticky: String(tokens.ZIndexSticky),
  fixed: String(tokens.ZIndexFixed),
  modalBackdrop: String(tokens.ZIndexModalBackdrop),
  modal: String(tokens.ZIndexModal),
  popover: String(tokens.ZIndexPopover),
  skipLink: String(tokens.ZIndexSkipLink),
  toast: String(tokens.ZIndexToast),
  tooltip: String(tokens.ZIndexTooltip),
} as const;
