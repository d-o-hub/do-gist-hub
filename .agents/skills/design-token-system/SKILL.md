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
- **2026 Easing Functions**: Use `--ease-out-expo`, `--ease-in-expo`, `--ease-elastic`, `--ease-smooth` for professional motion
- **Safe Area Support**: Include `env(safe-area-inset-*)` for notched devices
- **View Transitions**: Support `::view-transition` pseudo-elements for smooth navigation

## Production-Ready UI Checklist

Before considering UI work complete, verify:

### Visual Consistency
- [ ] All interactive elements have consistent styling (buttons, nav items, inputs)
- [ ] No unstyled default browser elements visible at any breakpoint
- [ ] Active/hover/focus states defined for all interactive elements
- [ ] Typography uses token values, no hardcoded font sizes

### Responsive Behavior
- [ ] Mobile (< 768px): Sidebar hidden, bottom nav visible
- [ ] Desktop (>= 768px): Sidebar visible, bottom nav hidden
- [ ] All 7 breakpoints tested with screenshots
- [ ] No horizontal overflow at any width

### Navigation Patterns
- [ ] Sidebar items styled with `.sidebar-item` class (not default buttons)
- [ ] Bottom nav items use `.nav-item` with proper touch targets (44x44px min)
- [ ] Active state visually distinct on both navigation types
- [ ] Icons and labels aligned consistently

### CSS Structure
```css
/* Base: Hide sidebar on mobile */
.sidebar-nav {
  display: none;
}

/* Desktop: Show sidebar */
@media (min-width: 768px) {
  .sidebar-nav {
    display: flex;
    /* ... sidebar styles ... */
  }
}

/* Sidebar items - styled like buttons */
.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2-5) var(--spacing-3);
  border: none;
  background: transparent;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--color-foreground-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  min-height: 40px;
  width: 100%;
  transition: all var(--motion-duration-fast) var(--ease-out-expo);
}

.sidebar-item:hover {
  background-color: var(--color-interactive-hover);
  color: var(--color-foreground-primary);
}

.sidebar-item.active {
  background-color: var(--color-accent-primary);
  color: var(--color-foreground-inverse);
  font-weight: var(--font-weight-semibold);
  box-shadow: 0 2px 8px var(--color-accent-glow);
}
```

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

## Layout Best Practices (2026)

See `references/mobile-layout-2026.md` for complete mobile layout patterns including:
- `100dvh` usage for mobile viewport stability
- Safe area inset handling for notched devices
- Flexbox patterns that prevent gaps between header/content
- Common layout pitfalls and solutions

### Quick Layout Checklist

- [ ] App shell uses `min-height: 100dvh` (with `100vh` fallback)
- [ ] Flex children with overflow have `min-height: 0`
- [ ] Header uses `env(safe-area-inset-top)` for notch support
- [ ] Bottom nav uses `env(safe-area-inset-bottom)`
- [ ] No gaps between header and content areas
- [ ] Layout tested at 320px, 390px, 768px, 1536px

## References

- https://www.designtokens.org/ - Design Tokens Community Group
- https://github.com/design-tokens/community-group - DTCG GitHub
- `references/mobile-layout-2026.md` - Mobile layout best practices
- `references/production-ui-standards.md` - Production UI standards
- `AGENTS.md` - Token architecture rules
