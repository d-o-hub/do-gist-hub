/**
 * Elevation Tokens
 * Shadow and z-index values for layering
 * 2026 Update: Added dark mode tonal shadows
 */

export const shadowTokens = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  // 2026: Tonal shadows for dark mode (lighter, subtler)
  'sm-dark': '0 1px 2px rgba(255, 255, 255, 0.04)',
  'md-dark': '0 4px 6px -1px rgba(255, 255, 255, 0.06), 0 2px 4px -1px rgba(255, 255, 255, 0.04)',
  'lg-dark': '0 10px 15px -3px rgba(255, 255, 255, 0.08), 0 4px 6px -2px rgba(255, 255, 255, 0.04)',
} as const;

export const zIndex = {
  hide: '-1',
  base: '0',
  dropdown: '1000',
  sticky: '1100',
  fixed: '1200',
  modalBackdrop: '1300',
  modal: '1400',
  popover: '1500',
  skipLink: '1600',
  toast: '1700',
  tooltip: '1800',
} as const;
