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
      primary: '#09090B',
      secondary: '#18181B',
      tertiary: '#27272A',
      elevated: '#27272A',
    },
    foreground: {
      primary: '#FAFAFA',
      secondary: '#D4D4D8',
      muted: '#A1A1AA',
      inverse: '#09090B',
    },
    accent: {
      primary: '#3B82F6',
      hover: '#60A5FA',
      active: '#93C5FD',
      subtle: '#1E3A8A',
    },
    border: {
      default: '#3F3F46',
      emphasis: '#52525B',
      strong: '#71717A',
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
