/**
 * Component Token: Button
 * Button-specific tokens derived from semantic tokens
 */

import * as tokens from '../generated/tokens';

export const buttonTokens = {
  // Padding by size
  padding: {
    sm: tokens.ButtonPaddingSm,
    md: tokens.ButtonPaddingMd,
    lg: tokens.ButtonPaddingLg,
  },

  // Font size by size
  fontSize: {
    sm: tokens.ButtonFontSizeSm,
    md: tokens.ButtonFontSizeMd,
    lg: tokens.ButtonFontSizeLg,
  },

  // Font weight
  fontWeight: tokens.ButtonFontWeight,

  // Border radius
  borderRadius: tokens.ButtonBorderRadius,

  // Transition
  transition: {
    duration: tokens.MotionDurationFast,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // Smooth
  },

  // Min height for touch targets (accessibility)
  minHeight: {
    sm: tokens.ButtonMinHeightSm,
    md: tokens.ButtonMinHeightMd,
    lg: tokens.ButtonMinHeightLg,
  },
} as const;
