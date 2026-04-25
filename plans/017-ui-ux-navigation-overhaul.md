<!-- Last Audit: 2026-04-25 -->
# Plan-017: UI/UX Navigation Overhaul

**Status**: Completed
**Date**: 2026-04-25
**Deciders**: UI/UX Agent, Accessibility Agent, Test Engineer

## Objective

Overhaul the application's navigation system to be fully mobile-first, accessible, and responsive across all 7 breakpoints, while eliminating CSS regressions and hardcoded values.

## Current State (Before)

- `html { overflow: hidden }` broke mobile scrolling
- Missing token aliases (`--space-5`, etc.) caused undefined CSS variables
- Hardcoded px values throughout navigation styles
- No safe area support for notched devices
- Touch targets below 44px on mobile
- Active nav items lacked `aria-current="page"`
- Navigation containers missing `role="navigation"` and `aria-label`
- Undefined CSS variables (`--color-accent-primary`, etc.) broke theming
- Skip links, focus-visible, reduced-motion, and high-contrast support missing or broken
- 90+ Playwright tests failing due to viewport-specific locator issues

## Completed Work

### 1. Mobile-First Navigation

Fixed CSS for all breakpoints using mobile-first approach:

| Breakpoint | Width | Navigation Style |
|------------|-------|------------------|
| Mobile | 320-767px | Bottom tab bar with `env(safe-area-inset-bottom)` |
| Tablet | 768-1023px | Rail navigation (72px width) |
| Desktop | 1024px+ | Sidebar navigation (240px width) |
| Large Desktop | 1536px+ | Spacious layout with increased padding |

**Pattern applied**: Base styles hide sidebar and show bottom nav; media queries progressively enhance:
```css
.sidebar-nav { display: none; }
.bottom-nav { display: flex; }

@media (min-width: 768px) {
  .sidebar-nav { display: flex; }
  .bottom-nav { display: none; }
}
```

### 2. CSS Fixes

- **Removed** `html { overflow: hidden }` that prevented mobile scrolling
- **Added** `--space-5` and other missing token aliases to `base.css`
- **Replaced** all hardcoded px values with design tokens (`--spacing-*`, `--color-*`)
- **Added** safe area insets: `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`
- **Added** `min-height: 44px` touch targets on all interactive navigation elements
- **Added** `aria-current="page"` to active nav items in `src/components/app.ts`
- **Added** `role="navigation"` and `aria-label` attributes to nav containers

### 3. Accessibility Improvements

- **Fixed undefined CSS variables**: `--color-accent-primary`, `--color-text-primary`, etc. now map to correct token references
- **Added** `focus-visible` styles with 2px outline and offset for keyboard navigation
- **Added** `@media (prefers-reduced-motion: reduce)` support in `motion.css`
- **Added** `@media (prefers-contrast: high)` support in `accessibility.css`
- **Fixed** skip link styles so they are visually hidden but focusable

### 4. Test Fixes

Updated Playwright locators for cross-viewport stability:

```typescript
// Before (failed on some viewports)
page.locator('[data-testid="nav-item"]');

// After (works across all breakpoints)
page.locator('[data-testid="nav-item"]')
  .filter({ visible: true })
  .first();
```

Fixed 90+ tests across:
- `tests/accessibility/semantics.spec.ts`
- `tests/accessibility/keyboard.spec.ts`
- `tests/accessibility/screen-reader.spec.ts`
- `tests/mobile/responsive.spec.ts`
- `tests/offline/sync.spec.ts`

## Files Modified

| File | Changes |
|------|---------|
| `src/styles/base.css` | Removed `overflow: hidden`, added token aliases, dynamic viewport units |
| `src/styles/navigation.css` | Mobile-first nav, rail/sidebar breakpoints, safe areas, 44px touch targets |
| `src/styles/accessibility.css` | Skip links, focus-visible, high contrast, undefined variable fixes |
| `src/styles/motion.css` | Reduced motion support |
| `src/styles/interactions.css` | Tokenized hover/active states |
| `src/styles/modern-glass.css` | Glassmorphism uses tokens only |
| `src/styles/empty-state.css` | Tokenized spacing and colors |
| `src/components/app.ts` | `aria-current`, `role`, `aria-label` on nav elements |
| `tests/accessibility/semantics.spec.ts` | Visible-first locators |
| `tests/accessibility/keyboard.spec.ts` | Visible-first locators |
| `tests/accessibility/screen-reader.spec.ts` | Visible-first locators |
| `tests/mobile/responsive.spec.ts` | Multi-viewport assertions |
| `tests/offline/sync.spec.ts` | Stable nav locators |

## Tradeoffs

### Pros
- Navigation works correctly on all 7 breakpoints
- No unstyled elements at any viewport
- WCAG 2.1 AA compliant keyboard and screen reader support
- Tests stable across mobile, tablet, and desktop
- All values derive from design tokens (no hardcoded px/hex)

### Cons
- Slightly more complex CSS due to 4 navigation modes
- Tablet rail navigation (72px) has limited space for labels
- Bottom nav requires safe area padding increasing overall height on notched phones

## Consequences

### User Experience
- Mobile users can scroll naturally (no `overflow: hidden`)
- Notched devices show proper padding
- Touch targets meet WCAG minimums
- Screen readers announce navigation landmarks correctly

### Developer Experience
- All navigation styles are token-driven
- Mobile-first media queries are predictable
- Tests use `filter({ visible: true })` pattern for cross-viewport stability

## Rollback Triggers

- New navigation mode causes usability issues on specific devices
- Performance impact from increased CSS complexity
- Accessibility audit finds remaining violations

## References

- `src/styles/navigation.css` — primary navigation styles
- `src/styles/accessibility.css` — a11y improvements
- `src/config/app.config.ts` — app identity and theme source
- `.agents/skills/design-token-system/SKILL.md` — token architecture
- `.agents/skills/responsive-system/SKILL.md` — 7-breakpoint system
- `agents-docs/patterns/mobile-first-navigation.md` — navigation patterns
- `agents-docs/patterns/dynamic-viewport-units.md` — dvh usage

---

*Created: 2026-04-25. Status: Completed.*
