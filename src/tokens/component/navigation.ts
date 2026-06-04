/**
 * Component Tokens: Navigation & Layout
 * 2026: Tokens for nav bars, sidebars, and layout components
 *
 * Token-driven width/height for nav surfaces so CSS never hardcodes
 * nav dimensions. Safe-area tokens cover the bottom-nav so the
 * `100dvh` + iOS home indicator gap stays consistent across surfaces.
 */

export const navTokens = {
  // Bottom nav (mobile ≤767px)
  bottomNav: {
    height: '64px',
    heightLarge: '72px', // at >=480px viewport
    padding: '0.5rem',
    paddingLarge: '0.75rem', // at >=480px viewport
  },

  // Rail nav (tablet 768-1023px)
  railNav: {
    width: '72px',
    padding: '1rem 0.5rem',
    gap: '0.5rem',
    itemPadding: '0.5rem 0.25rem',
    itemFontSize: 'var(--font-size-xs)',
  },

  // Sidebar (desktop >=1024px)
  sidebar: {
    width: '240px',
    widthLarge: '260px', // at >=1280px
    widthWide: '280px', // at >=1536px
    padding: '1.5rem',
    paddingLarge: '1.5rem 2rem', // at >=1280px
  },

  // Nav items
  navItem: {
    minWidth: '64px',
    minHeight: '44px',
  },

  // Header
  header: {
    actionsGap: '0.5rem',
    actionsGapNarrow: '0.25rem', // at <=389px viewport
    syncIndicatorSize: '32px',
    syncDotSize: '0.5rem',
    padding: '0.75rem 1rem',
    paddingNarrow: '0.5rem 0.75rem', // at <=389px viewport
  },

  // Safe-area insets for fixed/sticky nav surfaces
  // (iOS notch, Android display cutout, home indicator)
  safeArea: {
    top: 'env(safe-area-inset-top, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
  },
} as const;

export const layoutTokens = {
  // Content editor
  contentEditor: {
    minHeight: '200px',
    lineNumberWidth: '50px',
  },

  // Spinner
  spinner: {
    size: '24px',
  },

  // Status dot
  statusDot: {
    size: '12px',
  },

  // Comparison grid (conflict resolution)
  comparisonGrid: {
    gapNarrow: '1rem',
    gapWide: '1.5rem',
    paddingNarrow: '1rem',
    paddingTablet: '1.5rem',
    paddingDesktop: '1.5rem 2rem',
    paddingWide: '2rem 2.5rem',
    maxWidth: '1400px',
  },
} as const;
