/**
 * Responsive Breakpoint Tokens
 * 7 breakpoints from mobile-first design
 */

export const breakpoints = {
  'phone-small': '320px',
  phone: '390px',
  'phone-large': '480px',
  'tablet-portrait': '768px',
  'tablet-landscape': '1024px',
  desktop: '1280px',
  'desktop-wide': '1536px',
} as const;

/**
 * Responsive Container Widths
 */
export const containerWidths = {
  'phone-small': '100%',
  phone: '100%',
  'phone-large': '100%',
  'tablet-portrait': '720px',
  'tablet-landscape': '960px',
  desktop: '1200px',
  'desktop-wide': '1440px',
} as const;
