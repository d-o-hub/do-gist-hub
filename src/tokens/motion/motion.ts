/**
 * Motion Tokens (2026)
 * Animation duration and easing values following modern best practices
 */

export const motionTokens = {
  // Duration values (2026 refined)
  duration: {
    instant: '0ms',
    fast: '150ms', // Hover states, micro-interactions
    normal: '200ms', // Button presses, toggles
    slow: '300ms', // Page transitions, modals
    deliberate: '400ms', // Complex animations
  },

  // Easing functions (2026 comprehensive)
  easing: {
    // Standard
    linear: 'linear',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)', // General purpose
    out: 'cubic-bezier(0, 0, 0.2, 1)', // Elements entering
    in: 'cubic-bezier(0.4, 0, 1, 1)', // Elements exiting

    // Dramatic (2026 additions)
    outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)', // Dramatic entrances
    inExpo: 'cubic-bezier(0.7, 0, 0.84, 0)', // Quick exits
    elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Playful interactions

    // Spring physics (2026: CSS linear() for natural motion)
    spring:
      'linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938, 1.058, 1.072, 1.074, 1.065, 1.048, 1.026, 1.007, 0.995, 0.988)',
    springOut:
      'linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938, 1.058, 1.072, 1.074, 1.065, 1.048, 1.026, 1.007, 0.995, 0.988)',
  },

  // Reduced motion preference
  reduceMotion: '@media (prefers-reduced-motion: reduce)',

  // Animation keyframes references
  keyframes: {
    skeleton: 'skeleton-shimmer',
    fadeIn: 'fade-in',
    fadeOut: 'fade-out',
    slideUp: 'slide-up',
    pulse: 'pulse',
  },
} as const;

export type MotionTokens = typeof motionTokens;
export type DurationToken = keyof typeof motionTokens.duration;
export type EasingToken = keyof typeof motionTokens.easing;
