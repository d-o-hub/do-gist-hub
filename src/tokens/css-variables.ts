/**
 * CSS Variables Generator
 * Converts design tokens into CSS custom properties
 */

import { colors } from './primitive/colors';
import { spacing } from './primitive/spacing';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
} from './primitive/typography';
import { radius } from './primitive/radius';
import { motionTokens } from './motion/motion';
import { shadowTokens } from './elevation/shadows';
import { colorSemantic } from './semantic/color-semantic';
import { breakpoints } from './responsive/breakpoints';
import { navTokens } from './component/navigation';
import { uiTokens } from './component/ui';
import { gistCard } from './component/cards';

export function generateCSSVariables(): string {
  return `
:root {
  /* ===== Color Primitives ===== */
  --color-black: ${colors.black};
  --color-white: ${colors.white};

  --color-gray-50: ${colors.gray[50]};
  --color-gray-100: ${colors.gray[100]};
  --color-gray-200: ${colors.gray[200]};
  --color-gray-300: ${colors.gray[300]};
  --color-gray-400: ${colors.gray[400]};
  --color-gray-500: ${colors.gray[500]};
  --color-gray-600: ${colors.gray[600]};
  --color-gray-700: ${colors.gray[700]};
  --color-gray-800: ${colors.gray[800]};
  --color-gray-900: ${colors.gray[900]};
  --color-gray-950: ${colors.gray[950]};

  /* ===== Semantic Colors (Light Mode) ===== */
  --color-background-primary: ${colorSemantic.light.background.primary};
  --color-background-secondary: ${colorSemantic.light.background.secondary};
  --color-background-tertiary: ${colorSemantic.light.background.tertiary};
  --color-background-elevated: ${colorSemantic.light.background.elevated};

  --color-foreground-primary: ${colorSemantic.light.foreground.primary};
  --color-foreground-secondary: ${colorSemantic.light.foreground.secondary};
  --color-foreground-muted: ${colorSemantic.light.foreground.muted};
  --color-foreground-inverse: ${colorSemantic.light.foreground.inverse};

  --color-accent-primary: ${colorSemantic.light.accent.primary};
  --color-accent-hover: ${colorSemantic.light.accent.hover};
  --color-accent-active: ${colorSemantic.light.accent.active};
  --color-accent-subtle: ${colorSemantic.light.accent.subtle};
  --color-accent-glow: ${colorSemantic.light.accent.glow};

  --color-border-default: ${colorSemantic.light.border.default};
  --color-border-emphasis: ${colorSemantic.light.border.emphasis};
  --color-border-strong: ${colorSemantic.light.border.strong};

  --color-status-success-bg: ${colorSemantic.light.status.success.bg};
  --color-status-success-fg: ${colorSemantic.light.status.success.fg};
  --color-status-success-border: ${colorSemantic.light.status.success.border};

  --color-status-error-bg: ${colorSemantic.light.status.error.bg};
  --color-status-error-fg: ${colorSemantic.light.status.error.fg};
  --color-status-error-border: ${colorSemantic.light.status.error.border};
  
  --color-status-warning-bg: ${colorSemantic.light.status.warning.bg};
  --color-status-warning-fg: ${colorSemantic.light.status.warning.fg};
  --color-status-warning-border: ${colorSemantic.light.status.warning.border};
  
  --color-status-info-bg: ${colorSemantic.light.status.info.bg};
  --color-status-info-fg: ${colorSemantic.light.status.info.fg};
  --color-status-info-border: ${colorSemantic.light.status.info.border};
  
  --color-interactive-hover: ${colorSemantic.light.interactive.hover};
  --color-interactive-active: ${colorSemantic.light.interactive.active};
  --color-interactive-focus: ${colorSemantic.light.interactive.focus};
  
  /* ===== Spacing Tokens ===== */
  --spacing-0: ${spacing[0]};
  --spacing-0-5: ${spacing[0.5]};
  --spacing-1: ${spacing[1]};
  --spacing-1-5: ${spacing[1.5]};
  --spacing-2: ${spacing[2]};
  --spacing-2-5: ${spacing[2.5]};
  --spacing-3: ${spacing[3]};
  --spacing-4: ${spacing[4]};
  --spacing-5: ${spacing[5]};
  --spacing-6: ${spacing[6]};
  --spacing-7: ${spacing[7]};
  --spacing-8: ${spacing[8]};
  --spacing-9: ${spacing[9]};
  --spacing-10: ${spacing[10]};
  --spacing-11: ${spacing[11]};
  --spacing-12: ${spacing[12]};
  --spacing-14: ${spacing[14]};
  --spacing-16: ${spacing[16]};
  --spacing-20: ${spacing[20]};
  --spacing-24: ${spacing[24]};
  --spacing-28: ${spacing[28]};
  --spacing-32: ${spacing[32]};
  --spacing-36: ${spacing[36]};
  --spacing-40: ${spacing[40]};
  --spacing-44: ${spacing[44]};
  --spacing-48: ${spacing[48]};
  --spacing-52: ${spacing[52]};
  --spacing-56: ${spacing[56]};
  --spacing-60: ${spacing[60]};
  --spacing-64: ${spacing[64]};
  --spacing-72: ${spacing[72]};
  --spacing-80: ${spacing[80]};
  --spacing-96: ${spacing[96]};
  
  /* ===== Typography Tokens ===== */
  --font-family-sans: ${fontFamily.sans};
  --font-family-serif: ${fontFamily.serif};
  --font-family-mono: ${fontFamily.mono};
  
  --font-size-xs: ${fontSize.xs};
  --font-size-sm: ${fontSize.sm};
  --font-size-base: ${fontSize.base};
  --font-size-lg: ${fontSize.lg};
  --font-size-xl: ${fontSize.xl};
  --font-size-2xl: ${fontSize['2xl']};
  --font-size-3xl: ${fontSize['3xl']};
  --font-size-4xl: ${fontSize['4xl']};
  --font-size-5xl: ${fontSize['5xl']};
  --font-size-6xl: ${fontSize['6xl']};
  --font-size-7xl: ${fontSize['7xl']};
  --font-size-8xl: ${fontSize['8xl']};
  --font-size-9xl: ${fontSize['9xl']};
  
  --font-weight-thin: ${fontWeight.thin};
  --font-weight-extralight: ${fontWeight.extralight};
  --font-weight-light: ${fontWeight.light};
  --font-weight-normal: ${fontWeight.normal};
  --font-weight-medium: ${fontWeight.medium};
  --font-weight-semibold: ${fontWeight.semibold};
  --font-weight-bold: ${fontWeight.bold};
  --font-weight-extrabold: ${fontWeight.extrabold};
  --font-weight-black: ${fontWeight.black};
  
  --line-height-none: ${lineHeight.none};
  --line-height-tight: ${lineHeight.tight};
  --line-height-snug: ${lineHeight.snug};
  --line-height-normal: ${lineHeight.normal};
  --line-height-relaxed: ${lineHeight.relaxed};
  --line-height-loose: ${lineHeight.loose};
  
  --letter-spacing-tighter: ${letterSpacing.tighter};
  --letter-spacing-tight: ${letterSpacing.tight};
  --letter-spacing-normal: ${letterSpacing.normal};
  --letter-spacing-wide: ${letterSpacing.wide};
  --letter-spacing-wider: ${letterSpacing.wider};
  --letter-spacing-widest: ${letterSpacing.widest};
  
  /* ===== Radius Tokens ===== */
  --radius-none: ${radius.none};
  --radius-sm: ${radius.sm};
  --radius-base: ${radius.base};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
  --radius-xl: ${radius.xl};
  --radius-2xl: ${radius['2xl']};
  --radius-3xl: ${radius['3xl']};
  --radius-full: ${radius.full};
  
  /* ===== Motion Tokens (2026) ===== */
  --motion-duration-instant: ${motionTokens.duration.instant};
  --motion-duration-fast: ${motionTokens.duration.fast};
  --motion-duration-normal: ${motionTokens.duration.normal};
  --motion-duration-slow: ${motionTokens.duration.slow};
  --motion-duration-deliberate: ${motionTokens.duration.deliberate};

  --motion-easing-linear: ${motionTokens.easing.linear};
  --motion-easing-smooth: ${motionTokens.easing.smooth};
  --motion-easing-out: ${motionTokens.easing.out};
  --motion-easing-in: ${motionTokens.easing.in};
  --motion-easing-out-expo: ${motionTokens.easing.outExpo};
  --motion-easing-in-expo: ${motionTokens.easing.inExpo};
  --motion-easing-elastic: ${motionTokens.easing.elastic};
  --motion-easing-spring: ${motionTokens.easing.spring};

  /* Legacy aliases for backward compatibility */
  --motion-easing-ease-in-out: ${motionTokens.easing.smooth};
  --motion-easing-ease-out: ${motionTokens.easing.out};
  --motion-easing-ease-in: ${motionTokens.easing.in};
  --motion-duration-slower: ${motionTokens.duration.deliberate};
  
  /* ===== Shadow Tokens ===== */
  --shadow-none: ${shadowTokens.none};
  --shadow-sm: ${shadowTokens.sm};
  --shadow-md: ${shadowTokens.md};
  --shadow-lg: ${shadowTokens.lg};
  --shadow-xl: ${shadowTokens.xl};
  --shadow-2xl: ${shadowTokens['2xl']};
  --shadow-inner: ${shadowTokens.inner};
  
  /* ===== Breakpoint Tokens ===== */
  --bp-phone-small: ${breakpoints['phone-small']};
  --bp-phone: ${breakpoints.phone};
  --bp-phone-large: ${breakpoints['phone-large']};
  --bp-tablet-portrait: ${breakpoints['tablet-portrait']};
  --bp-tablet-landscape: ${breakpoints['tablet-landscape']};
  --bp-desktop: ${breakpoints.desktop};
  --bp-desktop-wide: ${breakpoints['desktop-wide']};

  /* ===== Component Tokens (2026) ===== */
  --nav-bottom-height: ${navTokens.bottomNav.height};
  --nav-sidebar-width: ${navTokens.sidebar.width};
  --ui-backdrop-bg: ${uiTokens.backdrop.background};
  --ui-backdrop-blur: ${uiTokens.backdrop.blur};
  --gist-card-bg: ${gistCard.background};
  --gist-card-shadow: ${gistCard.shadow};
}

/* ===== Dark Theme Override ===== */
[data-theme="dark"] {
  --color-background-primary: ${colorSemantic.dark.background.primary};
  --color-background-secondary: ${colorSemantic.dark.background.secondary};
  --color-background-tertiary: ${colorSemantic.dark.background.tertiary};
  --color-background-elevated: ${colorSemantic.dark.background.elevated};

  --color-foreground-primary: ${colorSemantic.dark.foreground.primary};
  --color-foreground-secondary: ${colorSemantic.dark.foreground.secondary};
  --color-foreground-muted: ${colorSemantic.dark.foreground.muted};
  --color-foreground-inverse: ${colorSemantic.dark.foreground.inverse};

  --color-accent-primary: ${colorSemantic.dark.accent.primary};
  --color-accent-hover: ${colorSemantic.dark.accent.hover};
  --color-accent-active: ${colorSemantic.dark.accent.active};
  --color-accent-subtle: ${colorSemantic.dark.accent.subtle};
  --color-accent-glow: ${colorSemantic.dark.accent.glow};

  --color-border-default: ${colorSemantic.dark.border.default};
  --color-border-emphasis: ${colorSemantic.dark.border.emphasis};
  --color-border-strong: ${colorSemantic.dark.border.strong};

  --color-status-success-bg: ${colorSemantic.dark.status.success.bg};
  --color-status-success-fg: ${colorSemantic.dark.status.success.fg};
  --color-status-success-border: ${colorSemantic.dark.status.success.border};

  --color-status-error-bg: ${colorSemantic.dark.status.error.bg};
  --color-status-error-fg: ${colorSemantic.dark.status.error.fg};
  --color-status-error-border: ${colorSemantic.dark.status.error.border};

  --color-status-warning-bg: ${colorSemantic.dark.status.warning.bg};
  --color-status-warning-fg: ${colorSemantic.dark.status.warning.fg};
  --color-status-warning-border: ${colorSemantic.dark.status.warning.border};

  --color-status-info-bg: ${colorSemantic.dark.status.info.bg};
  --color-status-info-fg: ${colorSemantic.dark.status.info.fg};
  --color-status-info-border: ${colorSemantic.dark.status.info.border};

  --color-interactive-hover: ${colorSemantic.dark.interactive.hover};
  --color-interactive-active: ${colorSemantic.dark.interactive.active};
  --color-interactive-focus: ${colorSemantic.dark.interactive.focus};

  /* 2026: Tonal shadows for dark mode */
  --shadow-sm: ${shadowTokens['sm-dark']};
  --shadow-md: ${shadowTokens['md-dark']};
  --shadow-lg: ${shadowTokens['lg-dark']};

  /* Glass effects for dark mode */
  --ui-backdrop-bg: rgba(0, 0, 0, 0.7);
  --ui-glass-bg: ${uiTokens.glass.background};
  --ui-glass-border: ${uiTokens.glass.border};
}

/* ===== Responsive Container Spacing ===== */
@media (min-width: ${breakpoints['phone-small']}) {
  :root {
    --spacing-container: ${spacing[4]};
  }
}

@media (min-width: ${breakpoints.phone}) {
  :root {
    --spacing-container: ${spacing[4]};
  }
}

@media (min-width: ${breakpoints['phone-large']}) {
  :root {
    --spacing-container: ${spacing[5]};
  }
}

@media (min-width: ${breakpoints['tablet-portrait']}) {
  :root {
    --spacing-container: ${spacing[6]};
  }
}

@media (min-width: ${breakpoints['tablet-landscape']}) {
  :root {
    --spacing-container: ${spacing[8]};
  }
}

@media (min-width: ${breakpoints.desktop}) {
  :root {
    --spacing-container: ${spacing[10]};
  }
}

@media (min-width: ${breakpoints['desktop-wide']}) {
  :root {
    --spacing-container: ${spacing[12]};
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
