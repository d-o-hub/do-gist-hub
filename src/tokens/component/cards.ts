/**
 * Gist Card Component Tokens
 */
import * as tokens from '../generated/tokens';

export const gistCard = {
  background: tokens.GistCardBackground,
  backgroundHover: 'var(--color-interactive-hover)',
  borderRadius: tokens.GistCardBorderRadius,
  padding: tokens.GistCardPadding,
  shadow: tokens.GistCardShadow,
  shadowHover: tokens.GistCardShadowHover,
  titleColor: 'var(--color-accent-primary)',
  metaColor: 'var(--color-foreground-secondary)',
  descriptionColor: 'var(--color-foreground-primary)',
} as const;
