---
name: design-token-system
description: Build a production-ready token architecture aligned with DTCG standards. Supports themes, responsive scaling, and component tokens.
---

# Design Token System Skill

Build a portable, DTCG-aligned token architecture from scratch.

## When to Use

- Initializing design system for new project
- Upgrading existing token architecture
- Adding theme variants or responsive tokens
- Creating component token libraries

## Token Layers

See `references/token-examples.md` for full code examples for all 6 token layers:
1. **Primitive** - Raw values (colors, spacing, typography, radius)
2. **Semantic** - Meaningful names (background, foreground, accent)
3. **Component** - Component-specific (button, card, input)
4. **Responsive** - Breakpoint-aware scaling
5. **Motion** - Animation durations and easing
6. **Elevation** - Shadows and z-index

## Workflow

### Step 1: Define Token Requirements

Identify token needs based on UI components:
- Colors: backgrounds, foregrounds, accents, states (success/error/warning)
- Spacing: consistent scale (4px/8px base)
- Typography: font families, sizes, weights, line heights
- Radius: border radius values
- Motion: durations, easing curves
- Elevation: shadows, z-index layers

### Step 2: Normalize to DTCG Format

Use DTCG-style structure (see `references/token-examples.md` for full example).

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

See `references/token-examples.md` for the CSS variable generator function.

### Step 5: Create Type Definitions

See `references/token-examples.md` for TypeScript type definitions.

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

- https://www.designtokens.org/ - Design Tokens Community Group
- https://github.com/design-tokens/community-group - DTCG GitHub
- `AGENTS.md` - Token architecture rules
