/**
 * UI Component Tokens (2026)
 */
import * as tokens from '../generated/tokens';

export const uiTokens = {
  backdrop: {
    background: tokens.UiBackdropBackground,
    blur: tokens.UiBackdropBlur,
  },
  glass: {
    background: tokens.UiGlassBackground,
    border: tokens.UiGlassBorder,
    blur: tokens.UiGlassBlur,
  },
  card: {
    padding: 'var(--spacing-5)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--color-border-default)',
    background: 'var(--color-background-primary)',
    shadow: 'var(--shadow-md)',
    hoverShadow: 'var(--shadow-xl)',
  },
} as const;
