/**
 * Semantic Color Tokens
 * Colors mapped to UI roles for light and dark themes
 * Modernized 2026: Deep dark surfaces, subtle glow accents, refined light mode
 */

export const colorSemantic = {
  light: {
    background: {
      primary: '#FAFAFA',
      secondary: '#F3F4F6',
      tertiary: '#E5E7EB',
      elevated: '#FFFFFF',
    },
    foreground: {
      primary: '#0F172A',
      secondary: '#475569',
      muted: '#94A3B8',
      inverse: '#FFFFFF',
    },
    accent: {
      primary: '#3B82F6',
      hover: '#2563EB',
      active: '#1D4ED8',
      subtle: 'rgba(59, 130, 246, 0.08)',
      glow: 'rgba(59, 130, 246, 0.25)',
    },
    border: {
      default: '#E2E8F0',
      emphasis: '#CBD5E1',
      strong: '#94A3B8',
    },
    status: {
      success: { bg: '#F0FDF4', fg: '#15803D', border: '#86EFAC' },
      error: { bg: '#FEF2F2', fg: '#B91C1C', border: '#FCA5A5' },
      warning: { bg: '#FFFBEB', fg: '#B45309', border: '#FDE047' },
      info: { bg: '#EFF6FF', fg: '#1D4ED8', border: '#93C5FD' },
    },
    interactive: {
      hover: '#F1F5F9',
      active: '#E2E8F0',
      focus: 'rgba(59, 130, 246, 0.15)',
    },
  },
  dark: {
    background: {
      primary: '#030712', // near-black base
      secondary: '#0A0F1A', // slightly elevated surface
      tertiary: '#111827', // card surfaces
      elevated: '#1A2332', // modals, overlays
    },
    foreground: {
      primary: '#F8FAFC', // near-white text
      secondary: '#CBD5E1', // secondary text
      muted: '#64748B', // muted/disabled
      inverse: '#030712', // dark text on light
    },
    accent: {
      // Modern blue with subtle glow effect
      primary: '#60A5FA', // bright blue for dark mode
      hover: '#93C5FD', // lighter on hover
      active: '#BFDBFE', // active state
      subtle: 'rgba(96, 165, 250, 0.10)', // translucent background
      glow: 'rgba(96, 165, 250, 0.35)', // glow effect
    },
    border: {
      default: '#1E293B', // subtle borders
      emphasis: '#334155', // emphasized borders
      strong: '#475569', // strong borders
    },
    status: {
      success: { bg: 'rgba(34, 197, 94, 0.10)', fg: '#4ADE80', border: '#22C55E' },
      error: { bg: 'rgba(239, 68, 68, 0.10)', fg: '#F87171', border: '#EF4444' },
      warning: { bg: 'rgba(234, 179, 8, 0.10)', fg: '#FACC15', border: '#EAB308' },
      info: { bg: 'rgba(59, 130, 246, 0.10)', fg: '#60A5FA', border: '#3B82F6' },
    },
    interactive: {
      hover: 'rgba(255, 255, 255, 0.05)',
      active: 'rgba(255, 255, 255, 0.08)',
      focus: 'rgba(96, 165, 250, 0.25)',
    },
  },
} as const;
