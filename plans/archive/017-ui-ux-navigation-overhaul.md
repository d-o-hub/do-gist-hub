<!-- Last Audit: 2026-04-25 -->
# Plan-017: UI/UX Navigation Overhaul v2

**Status**: Implemented
**Date**: 2026-04-25
**Deciders**: UI/UX Agent, Accessibility Agent, Test Engineer

## Objective

Overhaul the application's navigation system to be fully mobile-first, accessible, and responsive across all 7 breakpoints, while eliminating CSS regressions and hardcoded values. Based on screenshot analysis, the current menu overlay takes 100% viewport with poor visual hierarchy, no grouping, and zero responsive adaptation.

## Screenshot Analysis (Current Issues)

**Critical Issues Identified:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Full viewport overlay | High | Menu takes 100% screen, overwhelming UX |
| Poor visual hierarchy | High | "MENU" heading dominates, items lack grouping |
| No section grouping | High | "PREFERENCES" and "DATA & DIAGNOSTICS" float without structure |
| Missing responsive adaptation | Critical | Same layout on all viewports, no breakpoint handling |
| No interactive states | High | No hover, active, or focus indicators |
| Touch targets undersized | High | Text links without proper tap targets |
| No safe area support | Medium | No notch/home indicator padding |
| Hardcoded styling | High | No design token usage visible |
| Missing ARIA attributes | High | No semantic landmarks or screen reader support |

## Proposed Navigation Patterns

### Breakpoint Strategy (7 Breakpoints)

| Viewport | Width | Navigation Pattern | Implementation |
|----------|-------|-------------------|----------------|
| Mobile Small | 320px | Bottom sheet drawer | Slide up from bottom, max-height 70vh, backdrop blur |
| Mobile | 390px | Bottom sheet drawer | 5-item grid, 72px touch targets, safe area padding |
| Mobile Large | 480px | Bottom sheet + rail hybrid | Expanded sheet with grouped sections |
| Tablet Portrait | 768px | Navigation rail (72px) | Icon + label vertical, left edge |
| Tablet Landscape | 1024px | Collapsible sidebar (240px) | Icon + label, collapsible to 72px rail |
| Desktop | 1280px | Persistent sidebar (240px) | Fixed left, full feature set |
| Desktop Wide | 1536px+ | Spacious sidebar (280px) | Increased padding, wider touch targets |

### Mobile-First CSS Pattern

```css
/* Base: All viewports start here */
.sidebar-nav { display: none; }
.bottom-nav { display: none; }
.nav-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  transform: translateY(100%);
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 70vh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.nav-drawer.open { transform: translateY(0); }

/* Mobile Small 320px */
@media (min-width: 320px) {
  .nav-drawer { display: flex; }
}

/* Tablet 768px */
@media (min-width: 768px) {
  .nav-drawer { display: none; }
  .rail-nav {
    display: flex;
    width: 72px;
    height: 100dvh;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
}

/* Desktop 1280px */
@media (min-width: 1280px) {
  .rail-nav { display: none; }
  .sidebar-nav {
    display: flex;
    width: 240px;
    height: 100dvh;
    position: fixed;
    left: 0;
    top: 0;
  }
}

/* Desktop Wide 1536px+ */
@media (min-width: 1536px) {
  .sidebar-nav { width: 280px; }
}
```

## Section Grouping & Visual Hierarchy

### Navigation Structure

```
NAVIGATION
├── Primary Actions
│   ├── Home
│   ├── Starred Gists
│   └── Create New Gist
├── Secondary
│   ├── Offline Status
│   └── Sync Queue
└── System
    ├── Preferences
    ├── Data & Diagnostics
    └── Settings
```

### Visual Hierarchy Rules

1. **Primary Actions**: Prominent icons + labels, accent color on active
2. **Secondary**: Muted colors, smaller text, grouped with divider
3. **System**: Bottom of nav, minimal visual weight

## Implementation Requirements

### 1. Mobile (320-767px) - Bottom Sheet Drawer

**Layout:**
- Slide up from bottom with backdrop
- Max-height: 70vh, scrollable content
- Border-radius: `--radius-xl` top corners
- Sections separated by `--spacing-px` dividers

**Touch Targets:**
- Minimum 44px height (72px recommended)
- Minimum 44px width
- `--spacing-3` gap between items

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`
- Focus trap inside drawer
- Escape key to close
- Swipe down to dismiss

### 2. Tablet Portrait (768-1023px) - Rail Navigation

**Layout:**
- Fixed left, 72px width
- Vertical icon + label stack
- Active item: accent background pill

**Touch Targets:**
- 72px x 56px minimum
- Icon 24px, label 12px font

### 3. Tablet Landscape + Desktop (1024px+) - Sidebar

**Layout:**
- Fixed left, 240px (280px on 1536px+)
- Collapsible to rail (72px) with toggle
- Header: App logo + name
- Sections with headers
- Footer: User info / status

## Design Token Mapping

All values derive from design tokens:

| Property | Token | Mobile | Tablet | Desktop |
|----------|-------|--------|--------|---------|
| Nav width | `--nav-width-*` | 100% | 72px | 240px |
| Item height | `--nav-item-height` | 56px | 72px | 44px |
| Icon size | `--nav-icon-size` | 24px | 24px | 20px |
| Label size | `--nav-label-size` | 12px | 11px | 14px |
| Section gap | `--nav-section-gap` | --spacing-4 | --spacing-2 | --spacing-3 |
| Active bg | `--color-nav-active` | accent/10 | accent/15 | accent/10 |
| Active text | `--color-nav-active-text` | accent | accent | accent |

## Accessibility Requirements

### ARIA Implementation

```html
<nav role="navigation" aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <a role="menuitem" aria-current="page" href="/">Home</a>
    </li>
  </ul>
</nav>
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Navigate between items |
| Enter/Space | Activate item |
| Escape | Close drawer/sheet |
| Arrow Up/Down | Navigate vertical list |
| Home/End | First/last item |

### Focus Management

- **Visible focus**: 2px outline with offset, `--color-focus-ring`
- **Focus trap**: In drawers/modals, cycle focus
- **Return focus**: On close, return to trigger element
- **Skip link**: "Skip to main content" link

### Screen Reader

- Navigation landmark with descriptive label
- Current page announced via `aria-current`
- Section headers as `aria-labelledby`
- Live region for status changes

## Motion Design

### Micro-interactions

| State | Duration | Easing | Transform |
|-------|----------|--------|-----------|
| Hover | 150ms | ease-out | translateY(-2px), scale(1.02) |
| Active | 100ms | ease-in | scale(0.98) |
| Focus | 200ms | ease | outline-offset 2px |
| Drawer open | 300ms | out-expo | translateY(0) |
| Drawer close | 250ms | in-expo | translateY(100%) |
| Rail expand | 200ms | smooth | width 72px → 240px |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .nav-drawer,
  .rail-nav,
  .sidebar-nav {
    transition: none !important;
    animation: none !important;
  }
}
```

## Testing Strategy

### Responsive Testing (Playwright)

```typescript
const viewports = [
  { name: 'mobile-small', width: 320, height: 568 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'mobile-large', width: 480, height: 896 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'desktop-wide', width: 1536, height: 900 },
];

for (const viewport of viewports) {
  test(`navigation renders at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    // Verify correct nav variant is visible
    // Verify touch targets >= 44px
    // Verify no horizontal overflow
  });
}
```

### Accessibility Testing

- [ ] Keyboard navigation works on all breakpoints
- [ ] Focus indicators visible
- [ ] Screen reader announces landmarks
- [ ] ARIA attributes correct
- [ ] Color contrast ≥ 4.5:1
- [ ] Touch targets ≥ 44x44px

## Files to Modify

| File | Changes |
|------|---------|
| `src/styles/navigation.css` | Complete rewrite with 7 breakpoints |
| `src/styles/base.css` | Safe area variables, dynamic viewport |
| `src/components/app.ts` | Navigation structure, ARIA attributes |
| `src/components/ui/bottom-sheet.ts` | Mobile sheet implementation |
| `tests/accessibility/navigation.spec.ts` | New test file |
| `tests/responsive/navigation.spec.ts` | New test file |

## Rollback Triggers

- Usability issues on specific devices
- Performance regression (>100ms first paint)
- Accessibility audit failures
- User complaints about navigation discoverability

## References

- `src/styles/navigation.css` — primary navigation styles
- `src/styles/accessibility.css` — a11y improvements
- `src/config/app.config.ts` — app identity and theme source
- `.agents/skills/design-token-system/SKILL.md` — token architecture
- `.agents/skills/responsive-system/SKILL.md` — 7-breakpoint system
- `agents-docs/patterns/mobile-first-navigation.md` — navigation patterns
- `agents-docs/patterns/dynamic-viewport-units.md` — dvh usage

---

*Created: 2026-04-25. Status: In Progress.*

_Created: 2026-04-25. Status: Implemented (2026-05-06)._

## Implementation Notes (2026-05-06)

- Created `src/components/ui/nav-rail.ts` component for tablet breakpoint (768-1023px)
- Nav rail uses token-driven CSS classes from `src/tokens/component/navigation.ts`
- Integrated with app.ts to conditionally render at tablet breakpoint
- Follows same patterns as bottom-sheet.ts (class-based, mount/unmount, keyboard nav)
- All quality gates pass, CI green
