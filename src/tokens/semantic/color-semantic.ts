/**
 * Semantic Color Tokens
 * Colors mapped to UI roles for light and theme
 * Modernized 2026: Deep dark surfaces, subtle glow accents, refined light mode
 */

import * as tokens from '../generated/tokens';

export const colorSemantic = {
  light: {
    background: {
      primary: tokens.SemanticLightBackgroundPrimary,
      secondary: tokens.SemanticLightBackgroundSecondary,
      tertiary: tokens.SemanticLightBackgroundTertiary,
      elevated: tokens.SemanticLightBackgroundElevated,
    },
    foreground: {
      primary: tokens.SemanticLightForegroundPrimary,
      secondary: tokens.SemanticLightForegroundSecondary,
      muted: tokens.SemanticLightForegroundMuted,
      inverse: tokens.SemanticLightForegroundInverse,
    },
    accent: {
      primary: tokens.SemanticLightAccentPrimary,
      hover: tokens.SemanticLightAccentHover,
      active: tokens.SemanticLightAccentActive,
      subtle: tokens.SemanticLightAccentSubtle,
      glow: tokens.SemanticLightAccentGlow,
    },
    border: {
      default: tokens.SemanticLightBorderDefault,
      emphasis: tokens.SemanticLightBorderEmphasis,
      strong: tokens.SemanticLightBorderStrong,
    },
    status: {
      success: {
        bg: tokens.SemanticLightStatusSuccessBg,
        fg: tokens.SemanticLightStatusSuccessFg,
        border: tokens.SemanticLightStatusSuccessBorder,
      },
      error: {
        bg: tokens.SemanticLightStatusErrorBg,
        fg: tokens.SemanticLightStatusErrorFg,
        border: tokens.SemanticLightStatusErrorBorder,
      },
      warning: {
        bg: tokens.SemanticLightStatusWarningBg,
        fg: tokens.SemanticLightStatusWarningFg,
        border: tokens.SemanticLightStatusWarningBorder,
      },
      info: {
        bg: tokens.SemanticLightStatusInfoBg,
        fg: tokens.SemanticLightStatusInfoFg,
        border: tokens.SemanticLightStatusInfoBorder,
      },
    },
    interactive: {
      hover: tokens.SemanticLightInteractiveHover,
      active: tokens.SemanticLightInteractiveActive,
      focus: tokens.SemanticLightInteractiveFocus,
    },
  },
  dark: {
    background: {
      primary: tokens.SemanticDarkBackgroundPrimary,
      secondary: tokens.SemanticDarkBackgroundSecondary,
      tertiary: tokens.SemanticDarkBackgroundTertiary,
      elevated: tokens.SemanticDarkBackgroundElevated,
    },
    foreground: {
      primary: tokens.SemanticDarkForegroundPrimary,
      secondary: tokens.SemanticDarkForegroundSecondary,
      muted: tokens.SemanticDarkForegroundMuted,
      inverse: tokens.SemanticDarkForegroundInverse,
    },
    accent: {
      primary: tokens.SemanticDarkAccentPrimary,
      hover: tokens.SemanticDarkAccentHover,
      active: tokens.SemanticDarkAccentActive,
      subtle: tokens.SemanticDarkAccentSubtle,
      glow: tokens.SemanticDarkAccentGlow,
    },
    border: {
      default: tokens.SemanticDarkBorderDefault,
      emphasis: tokens.SemanticDarkBorderEmphasis,
      strong: tokens.SemanticDarkBorderStrong,
    },
    status: {
      success: {
        bg: tokens.SemanticDarkStatusSuccessBg,
        fg: tokens.SemanticDarkStatusSuccessFg,
        border: tokens.SemanticDarkStatusSuccessBorder,
      },
      error: {
        bg: tokens.SemanticDarkStatusErrorBg,
        fg: tokens.SemanticDarkStatusErrorFg,
        border: tokens.SemanticDarkStatusErrorBorder,
      },
      warning: {
        bg: tokens.SemanticDarkStatusWarningBg,
        fg: tokens.SemanticDarkStatusWarningFg,
        border: tokens.SemanticDarkStatusWarningBorder,
      },
      info: {
        bg: tokens.SemanticDarkStatusInfoBg,
        fg: tokens.SemanticDarkStatusInfoFg,
        border: tokens.SemanticDarkStatusInfoBorder,
      },
    },
    interactive: {
      hover: tokens.SemanticDarkInteractiveHover,
      active: tokens.SemanticDarkInteractiveActive,
      focus: tokens.SemanticDarkInteractiveFocus,
    },
  },
} as const;
