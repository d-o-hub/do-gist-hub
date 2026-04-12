# Token Code Examples

## Primitive Tokens

```typescript
// src/tokens/primitive/colors.ts
export const colors = {
  black: '#000000',
  white: '#FFFFFF',
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    400: '#60a5fa',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  zinc: {
    900: '#18181b',
    950: '#09090b',
  },
} as const;
```

## Semantic Tokens

```typescript
// src/tokens/semantic/color-semantic.ts
export const colorSemantic = {
  light: {
    background: {
      primary: '{colors.white}',
      secondary: '{colors.gray.50}',
    },
    foreground: {
      primary: '{colors.gray.900}',
      secondary: '{colors.gray.600}',
    },
    accent: {
      primary: '{colors.blue.600}',
      hover: '{colors.blue.700}',
    },
  },
  dark: {
    background: {
      primary: '{colors.zinc.950}',
      secondary: '{colors.zinc.900}',
    },
    foreground: {
      primary: '{colors.white}',
      secondary: '{colors.gray.300}',
    },
    accent: {
      primary: '{colors.blue.500}',
      hover: '{colors.blue.400}',
    },
  },
} as const;
```

## Component Tokens

```typescript
// src/tokens/component/button.ts
export const buttonTokens = {
  padding: {
    sm: '{spacing.2} {spacing.3}',
    md: '{spacing.3} {spacing.4}',
    lg: '{spacing.4} {spacing.6}',
  },
  fontSize: {
    sm: '{fontSize.sm}',
    md: '{fontSize.base}',
    lg: '{fontSize.lg}',
  },
  borderRadius: '{radius.md}',
  fontWeight: '{fontWeight.medium}',
} as const;
```

## Responsive Tokens

```typescript
// src/tokens/responsive/spacing.ts
export const spacingResponsive = {
  container: {
    phone: '{spacing.4}',
    tablet: '{spacing.6}',
    desktop: '{spacing.8}',
  },
  gap: {
    compact: {
      phone: '{spacing.2}',
      tablet: '{spacing.3}',
      desktop: '{spacing.4}',
    },
    relaxed: {
      phone: '{spacing.4}',
      tablet: '{spacing.6}',
      desktop: '{spacing.8}',
    },
  },
} as const;
```

## Motion Tokens

```typescript
// src/tokens/motion/motion.ts
export const motionTokens = {
  duration: {
    instant: '100ms',
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  reduceMotion: 'prefers-reduced-motion: reduce',
} as const;
```

## Elevation Tokens

```typescript
// src/tokens/elevation/shadows.ts
export const shadowTokens = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;
```

## DTCG Format

```json
{
  "color": {
    "background": {
      "primary": {
        "$type": "color",
        "$value": "#050505",
        "$description": "Primary background color for dark mode"
      }
    }
  }
}
```

## CSS Variable Generator

```typescript
// src/tokens/css-variables.ts
export function generateCSSVariables(tokens: any): string {
  return `
    :root {
      --color-background-primary: ${tokens.semantic.background.primary};
      --color-foreground-primary: ${tokens.semantic.foreground.primary};
      --spacing-container: ${tokens.responsive.container.phone};
      --radius-md: ${tokens.primitive.radius.md};
      --motion-duration-fast: ${tokens.motion.duration.fast};
      --shadow-md: ${tokens.elevation.shadow.md};
    }

    @media (min-width: 768px) {
      :root {
        --spacing-container: ${tokens.responsive.container.tablet};
      }
    }

    @media (min-width: 1280px) {
      :root {
        --spacing-container: ${tokens.responsive.container.desktop};
      }
    }

    [data-theme="dark"] {
      --color-background-primary: ${tokens.semantic.dark.background.primary};
      --color-foreground-primary: ${tokens.semantic.dark.foreground.primary};
    }
  `;
}
```

## Type Definitions

```typescript
// src/tokens/types.ts
export interface TokenValue {
  $type: string;
  $value: string | number;
  $description?: string;
}

export interface ColorToken {
  $type: 'color';
  $value: string;
  $description?: string;
}

export interface SpacingToken {
  $type: 'dimension';
  $value: string;
  $description?: string;
}

export interface TypographyToken {
  $type: 'typography';
  $value: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
  };
}
```
