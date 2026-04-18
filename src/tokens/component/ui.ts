/**
 * UI Component Tokens (2026)
 */
export const uiTokens = {
  backdrop: {
    background: 'rgba(0, 0, 0, 0.5)',
    blur: '8px',
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.1)',
    blur: '12px',
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
