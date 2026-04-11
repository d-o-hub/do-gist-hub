/**
 * Semantic Color Tokens
 * Meaningful names tied to use cases with theme variants
 */

import { colors } from '../primitive/colors';

export const colorSemantic = {
  light: {
    // Background colors
    background: {
      primary: colors.white,
      secondary: colors.gray[50],
      tertiary: colors.gray[100],
      elevated: colors.white,
    },
    
    // Foreground/text colors
    foreground: {
      primary: colors.gray[900],
      secondary: colors.gray[600],
      muted: colors.gray[500],
      inverse: colors.white,
    },
    
    // Accent colors (primary actions)
    accent: {
      primary: colors.blue[600],
      hover: colors.blue[700],
      active: colors.blue[800],
      subtle: colors.blue[50],
    },
    
    // Border colors
    border: {
      default: colors.gray[200],
      emphasis: colors.gray[300],
      strong: colors.gray[400],
    },
    
    // Status colors
    status: {
      success: {
        bg: colors.green[50],
        fg: colors.green[700],
        border: colors.green[200],
      },
      error: {
        bg: colors.red[50],
        fg: colors.red[700],
        border: colors.red[200],
      },
      warning: {
        bg: colors.yellow[50],
        fg: colors.yellow[700],
        border: colors.yellow[200],
      },
      info: {
        bg: colors.blue[50],
        fg: colors.blue[700],
        border: colors.blue[200],
      },
    },
    
    // Interactive states
    interactive: {
      hover: 'rgba(0, 0, 0, 0.04)',
      active: 'rgba(0, 0, 0, 0.08)',
      focus: colors.blue[500],
    },
  },
  
  dark: {
    // Background colors
    background: {
      primary: colors.zinc[950],
      secondary: colors.zinc[900],
      tertiary: 'rgba(255, 255, 255, 0.03)',
      elevated: colors.zinc[900],
    },
    
    // Foreground/text colors
    foreground: {
      primary: colors.white,
      secondary: colors.gray[300],
      muted: colors.gray[500],
      inverse: colors.gray[900],
    },
    
    // Accent colors (primary actions)
    accent: {
      primary: colors.blue[500],
      hover: colors.blue[400],
      active: colors.blue[300],
      subtle: 'rgba(59, 130, 246, 0.1)',
    },
    
    // Border colors
    border: {
      default: 'rgba(255, 255, 255, 0.1)',
      emphasis: 'rgba(255, 255, 255, 0.15)',
      strong: 'rgba(255, 255, 255, 0.2)',
    },
    
    // Status colors
    status: {
      success: {
        bg: 'rgba(34, 197, 94, 0.1)',
        fg: colors.green[400],
        border: 'rgba(34, 197, 94, 0.2)',
      },
      error: {
        bg: 'rgba(239, 68, 68, 0.1)',
        fg: colors.red[400],
        border: 'rgba(239, 68, 68, 0.2)',
      },
      warning: {
        bg: 'rgba(234, 179, 8, 0.1)',
        fg: colors.yellow[400],
        border: 'rgba(234, 179, 8, 0.2)',
      },
      info: {
        bg: 'rgba(59, 130, 246, 0.1)',
        fg: colors.blue[400],
        border: 'rgba(59, 130, 246, 0.2)',
      },
    },
    
    // Interactive states
    interactive: {
      hover: 'rgba(255, 255, 255, 0.05)',
      active: 'rgba(255, 255, 255, 0.1)',
      focus: colors.blue[400],
    },
  },
} as const;
