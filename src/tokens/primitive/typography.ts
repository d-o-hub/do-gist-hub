/**
 * Primitive Typography Tokens
 * Raw typography values without semantic meaning
 * 2026 Update: Fluid typography with clamp() for smooth scaling
 */

import * as tokens from '../generated/tokens';

export const fontFamily = {
  sans: tokens.FontFamilySans,
  serif: tokens.FontFamilySerif,
  mono: tokens.FontFamilyMono,
} as const;

export const fontSize = {
  // Fluid typography with clamp() - scales smoothly from 320px to 1536px
  xs: tokens.FontSizeXs,
  sm: tokens.FontSizeSm,
  base: tokens.FontSizeBase,
  lg: tokens.FontSizeLg,
  xl: tokens.FontSizeXl,
  '2xl': tokens.FontSizeV2xl,
  '3xl': tokens.FontSizeV3xl,
  '4xl': tokens.FontSizeV4xl,
  '5xl': tokens.FontSizeV5xl,
  '6xl': tokens.FontSizeV6xl,
  '7xl': tokens.FontSizeV7xl,
  '8xl': tokens.FontSizeV8xl,
  '9xl': tokens.FontSizeV9xl,
} as const;

export const fontWeight = {
  thin: tokens.FontWeightThin,
  extralight: tokens.FontWeightExtralight,
  light: tokens.FontWeightLight,
  normal: tokens.FontWeightNormal,
  medium: tokens.FontWeightMedium,
  semibold: tokens.FontWeightSemibold,
  bold: tokens.FontWeightBold,
  extrabold: tokens.FontWeightExtrabold,
  black: tokens.FontWeightBlack,
} as const;

export const lineHeight = {
  none: tokens.LineHeightNone,
  tight: tokens.LineHeightTight,
  snug: tokens.LineHeightSnug,
  normal: tokens.LineHeightNormal,
  relaxed: tokens.LineHeightRelaxed,
  loose: tokens.LineHeightLoose,
  3: tokens.LineHeightLh3,
  4: tokens.LineHeightLh4,
  5: tokens.LineHeightLh5,
  6: tokens.LineHeightLh6,
  7: tokens.LineHeightLh7,
  8: tokens.LineHeightLh8,
  9: tokens.LineHeightLh9,
  10: tokens.LineHeightLh10,
} as const;

export const letterSpacing = {
  tighter: tokens.LetterSpacingTighter,
  tight: tokens.LetterSpacingTight,
  normal: tokens.LetterSpacingNormal,
  wide: tokens.LetterSpacingWide,
  wider: tokens.LetterSpacingWider,
  widest: tokens.LetterSpacingWidest,
} as const;
