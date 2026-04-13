/**
 * Component Tokens: Navigation & Layout
 * 2026: Tokens for nav bars, sidebars, and layout components
 */

export const navTokens = {
  // Bottom nav
  bottomNav: {
    height: '64px',
    padding: '0.5rem',
  },

  // Sidebar
  sidebar: {
    width: '240px',
    padding: '1rem',
  },

  // Nav items
  navItem: {
    minWidth: '64px',
    minHeight: '44px',
  },

  // Header
  header: {
    actionsGap: '0.5rem',
    syncIndicatorSize: '32px',
    syncDotSize: '0.5rem',
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
} as const;
