---
name: design-token-system
description: Convert the demo token design from do-gemini-ui-ux-skill into a production-ready token architecture aligned with DTCG standards. Supports themes, responsive scaling, and component tokens.
---

# Design Token System Skill

Productionize the token design from `do-gemini-ui-ux-skill` into a portable, DTCG-aligned architecture.

## When to Use

- Initializing design system for new project
- Upgrading existing token architecture
- Adding theme variants or responsive tokens
- Creating component token libraries

## Token Layers

### 1. Primitive Tokens

Raw values without semantic meaning:
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
  // ... more primitives
} as const;
```

### 2. Semantic Tokens

Meaningful names tied to use cases:
```typescript
// src/tokens/semantic/color-semantic.ts
export const colorSemantic = {
  light: {
    background: {
      primary: '{colors.white}',
      secondary: '{colors.gray.50}',
      tertiary: '{colors.gray.100}',
    },
    foreground: {
      primary: '{colors.gray.900}',
      secondary: '{colors.gray.600}',
      muted: '{colors.gray.500}',
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
      tertiary: 'rgba(255, 255, 255, 0.03)',
    },
    foreground: {
      primary: '{colors.white}',
      secondary: '{colors.gray.300}',
      muted: '{colors.gray.500}',
    },
    accent: {
      primary: '{colors.blue.500}',
      hover: '{colors.blue.400}',
    },
  },
} as const;
```

### 3. Component Tokens

Specific to UI components:
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

### 4. Responsive Tokens

Scale across breakpoints:
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

### 5. Motion Tokens

Animation and transition values:
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

### 6. Elevation Tokens

Shadows and layering:
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

## Workflow

### Step 1: Extract from Source

Inspect `do-gemini-ui-ux-skill`:
- `docs/design/design-system.md` - Core modes and effects
- `src/lib/design-system.tsx` - TOKENS object structure
- Identify reusable patterns

### Step 2: Normalize to DTCG Format

Use DTCG-style structure:
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

### Step 3: Create Token Files

```bash
src/tokens/
├── primitive/
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── radius.ts
├── semantic/
│   ├── color-semantic.ts
│   ├── spacing-semantic.ts
│   └── typography-semantic.ts
├── component/
│   ├── button.ts
│   ├── card.ts
│   ├── input.ts
│   └── navigation.ts
├── responsive/
│   ├── breakpoints.ts
│   └── spacing-responsive.ts
├── motion/
│   ├── duration.ts
│   └── easing.ts
├── elevation/
│   ├── shadows.ts
│   └── z-index.ts
└── index.ts
```

### Step 4: Generate CSS Custom Properties

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

### Step 5: Create Type Definitions

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

## Gotchas

- **No AI Slop**: Avoid generic purple gradients, default Inter font
- **Semantic Over Primitive**: Prefer `--color-accent-primary` over `--color-blue-600`
- **Responsive Scaling**: Define how tokens scale, don't just pick one size
- **Theme Consistency**: Dark and light themes must have equivalent tokens
- **Accessibility**: Ensure WCAG AA contrast ratios in all themes
- **DTCG Alignment**: Use `$type`, `$value`, `$description` for portability

## Required Outputs

- `src/tokens/primitive/` - Raw value tokens
- `src/tokens/semantic/` - Meaningful name tokens
- `src/tokens/component/` - Component-specific tokens
- `src/tokens/responsive/` - Breakpoint-aware tokens
- `src/tokens/motion/` - Animation tokens
- `src/tokens/elevation/` - Shadow/z-index tokens
- `src/tokens/index.ts` - Unified exports
- `src/tokens/css-variables.ts` - CSS custom property generator
- `src/tokens/types.ts` - TypeScript type definitions
- `docs/design/tokens.md` - Token documentation

## Verification

```bash
# Run token validation
npx -y node .agents/skills/design-token-system/scripts/validate-tokens.cjs

# Check CSS variable generation
npm run build:tokens

# Verify type safety
npm run typecheck
```

## References

- `do-gemini-ui-ux-skill` - Source token design
- https://www.designtokens.org/ - Design Tokens Community Group
- https://github.com/design-tokens/community-group - DTCG GitHub
- `AGENTS.md` - Token architecture rules
