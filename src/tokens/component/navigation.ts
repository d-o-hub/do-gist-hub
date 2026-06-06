/**
 * Component Tokens: Navigation & Layout
 * 2026: Tokens for nav bars, sidebars, and layout components
 */

import * as tokens from '../generated/tokens';

export const navTokens = {
  // Bottom nav (mobile ≤767px)
  bottomNav: {
    height: tokens.NavBottomHeight,
    heightLarge: tokens.NavBottomHeightLarge,
    padding: tokens.NavBottomPadding,
    paddingLarge: tokens.NavBottomPaddingLarge,
  },

  // Rail nav (tablet 768-1023px)
  railNav: {
    width: tokens.NavRailWidth,
    padding: tokens.NavRailPadding,
    gap: tokens.NavRailGap,
    itemPadding: tokens.NavRailItemPadding,
    itemFontSize: 'var(--font-size-xs)',
  },

  // Sidebar (desktop >=1024px)
  sidebar: {
    width: tokens.NavSidebarWidth,
    widthLarge: tokens.NavSidebarWidthLarge,
    widthWide: tokens.NavSidebarWidthWide,
    padding: tokens.NavSidebarPadding,
    paddingLarge: tokens.NavSidebarPaddingLarge,
  },

  // Nav items
  navItem: {
    minWidth: '64px',
    minHeight: '44px',
  },

  // Header
  header: {
    actionsGap: tokens.NavHeaderActionsGap,
    actionsGapNarrow: tokens.NavHeaderActionsGapNarrow,
    syncIndicatorSize: tokens.NavHeaderSyncIndicatorSize,
    syncDotSize: '0.5rem',
    padding: tokens.NavHeaderPadding,
    paddingNarrow: tokens.NavHeaderPaddingNarrow,
  },

  // Safe-area insets for fixed/sticky nav surfaces
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
