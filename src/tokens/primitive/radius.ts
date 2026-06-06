/**
 * Primitive Radius Tokens
 * Raw border radius values without semantic meaning
 */

import * as tokens from '../generated/tokens';

export const radius = {
  none: tokens.RadiusNone,
  sm: tokens.RadiusSm,
  base: tokens.RadiusBase,
  md: tokens.RadiusMd,
  lg: tokens.RadiusLg,
  xl: tokens.RadiusXl,
  '2xl': tokens.Radius2xl,
  '3xl': tokens.Radius3xl,
  full: tokens.RadiusFull,
} as const;
