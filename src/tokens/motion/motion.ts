/**
 * Motion Tokens
 * Animation duration and easing values
 */

export const motionTokens = {
  // Duration values
  duration: {
    instant: '100ms',
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
  },
  
  // Easing functions
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    linear: 'linear',
  },
  
  // Reduced motion preference
  reduceMotion: '@media (prefers-reduced-motion: reduce)',
} as const;
