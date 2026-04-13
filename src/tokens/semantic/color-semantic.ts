/**
 * Semantic Color Tokens
 * Colors mapped to UI roles for light and dark themes
 */

export const colorSemantic = {
  light: {
    background: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      tertiary: '#F3F4F6',
      elevated: '#FFFFFF',
    },
    foreground: {
      primary: '#111827',
      secondary: '#374151',
      muted: '#6B7280',
      inverse: '#FFFFFF',
    },
    accent: {
      primary: '#2563EB',
      hover: '#1D4ED8',
      active: '#1E40AF',
      subtle: '#DBEAFE',
    },
    border: {
      default: '#E5E7EB',
      emphasis: '#9CA3AF',
      strong: '#6B7280',
    },
    status: {
      success: { bg: '#F0FDF4', fg: '#166534', border: '#86EFAC' },
      error: { bg: '#FEF2F2', fg: '#991B1B', border: '#FCA5A5' },
      warning: { bg: '#FEFCE8', fg: '#854D0E', border: '#FDE047' },
      info: { bg: '#EFF6FF', fg: '#1E40AF', border: '#93C5FD' },
    },
    interactive: {
      hover: '#F3F4F6',
      active: '#E5E7EB',
      focus: '#BFDBFE',
    },
  },
  dark: {
    background: {
      primary: '#09090B',      // zinc.950 - base surface
      secondary: '#0C0C0F',    // slightly elevated
      tertiary: '#131317',     // more elevated
      elevated: '#1A1A1F',     // highest surface (cards, modals)
    },
    foreground: {
      primary: '#FAFAFA',      // zinc.50
      secondary: '#D4D4D8',    // zinc.300
      muted: '#A1A1AA',        // zinc.400
      inverse: '#09090B',      // zinc.950
    },
    accent: {
      // 2026: Desaturated accents for dark mode (reduced vibration)
      primary: '#60A5FA',      // blue.400 (lighter, less saturated)
      hover: '#93C5FD',        // blue.300
      active: '#BFDBFE',       // blue.200
      subtle: 'rgba(96, 165, 250, 0.12)',  // translucent blue
    },
    border: {
      default: '#3F3F46',      // zinc.700
      emphasis: '#52525B',     // zinc.600
      strong: '#71717A',       // zinc.500
    },
    status: {
      success: { bg: '#14532D', fg: '#86EFAC', border: '#166534' },
      error: { bg: '#7F1D1D', fg: '#FCA5A5', border: '#991B1B' },
      warning: { bg: '#713F12', fg: '#FDE047', border: '#854D0E' },
      info: { bg: '#172554', fg: '#93C5FD', border: '#1E40AF' },
    },
    interactive: {
      hover: '#27272A',
      active: '#3F3F46',
      focus: '#1E40AF',
    },
  },
} as const;
