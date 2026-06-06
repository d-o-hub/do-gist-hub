/**
 * Motion Tokens (2026)
 * Animation duration and easing values following modern best practices
 */

import * as tokens from '../generated/tokens';

export const motionTokens = {
  // Duration values (2026 refined)
  duration: {
    instant: tokens.MotionDurationInstant,
    fast: tokens.MotionDurationFast,
    normal: tokens.MotionDurationNormal,
    slow: tokens.MotionDurationSlow,
    deliberate: tokens.MotionDurationDeliberate,
  },

  // Easing functions (2026 comprehensive)
  easing: {
    // Standard
    linear: tokens.MotionEasingLinear,
    smooth: `cubic-bezier(${tokens.MotionEasingSmooth.join(', ')})`,
    out: `cubic-bezier(${tokens.MotionEasingOut.join(', ')})`,
    in: `cubic-bezier(${tokens.MotionEasingIn.join(', ')})`,

    // Dramatic (2026 additions)
    outExpo: `cubic-bezier(${tokens.MotionEasingOutExpo.join(', ')})`,
    inExpo: `cubic-bezier(${tokens.MotionEasingInExpo.join(', ')})`,
    elastic: `cubic-bezier(${tokens.MotionEasingElastic.join(', ')})`,

    // Spring physics (2026: CSS linear() for natural motion)
    spring: tokens.MotionEasingSpring,
    springOut: tokens.MotionEasingSpring,
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
