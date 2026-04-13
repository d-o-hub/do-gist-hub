/**
 * Primitive Typography Tokens
 * Raw typography values without semantic meaning
 * 2026 Update: Fluid typography with clamp() for smooth scaling
 */

export const fontFamily = {
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

export const fontSize = {
  // Fluid typography with clamp() - scales smoothly from 320px to 1536px
  xs: 'clamp(0.6875rem, 0.625rem + 0.25vw, 0.75rem)',       // 11-12px
  sm: 'clamp(0.75rem, 0.6875rem + 0.3125vw, 0.875rem)',     // 12-14px
  base: 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',           // 14-16px
  lg: 'clamp(1rem, 0.875rem + 0.5vw, 1.125rem)',             // 16-18px
  xl: 'clamp(1.125rem, 0.9375rem + 0.75vw, 1.25rem)',        // 18-20px
  '2xl': 'clamp(1.25rem, 1rem + 1vw, 1.5rem)',               // 20-24px
  '3xl': 'clamp(1.5rem, 1.125rem + 1.5vw, 1.875rem)',        // 24-30px
  '4xl': 'clamp(1.875rem, 1.25rem + 2.5vw, 2.25rem)',        // 30-36px
  '5xl': 'clamp(2.25rem, 1.5rem + 3.75vw, 3rem)',            // 36-48px
  '6xl': 'clamp(2.75rem, 1.75rem + 5vw, 3.75rem)',           // 44-60px
  '7xl': 'clamp(3.25rem, 2rem + 6.25vw, 4.5rem)',            // 52-72px
  '8xl': 'clamp(4rem, 2.5rem + 7.5vw, 6rem)',                // 64-96px
  '9xl': 'clamp(5rem, 3rem + 10vw, 8rem)',                   // 80-128px
} as const;

export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
  3: '.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
} as const;

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;
