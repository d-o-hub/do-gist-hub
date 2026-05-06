<!-- Last Audit: 2026-05-06 -->

# ADR-022: 2026 UI Trends Integration Recommendations

## Status

Proposed

## Context

The d.o. Gist Hub UI modernization (ADR-007) successfully implemented core 2026 patterns: container queries, View Transitions API, 7-breakpoint responsive system, and accessibility-first design.

Recent industry research (2026 Q1-Q2) reveals additional trends that can enhance the user experience:

1. **Bento grid layouts** - Asymmetric, modular card layouts for content density without overload
2. **Glassmorphism 2.0** - Strategic blur effects on nav bars, overlays, modals (not content cards)
3. **Dark mode first** - 80% of mobile users prefer dark mode; design dark theme first
4. **Spring physics** - CSS `linear()` easing for natural motion (replacing cubic-bezier)
5. **Scroll-driven animations** - CSS `animation-timeline: scroll()` for zero-JS effects
6. **Variable fonts** - Single file replacing 4-6 font files for performance
7. **Bold kinetic typography** - 8-10rem hero text, animated headings
8. **Context-aware theming** - Beyond dark/light: time-of-day, ambient light, content-type adaptation
9. **Performance budgets** - Set limits before design phase
10. **Bento grids for gist cards** - Asymmetric card layouts with visual hierarchy
11. **Button styles** - Token-driven, no emojis/icons, micro-interactions, accessibility-first

## Decision

We will integrate selected 2026 trends that align with d.o. Gist Hub's offline-first, productivity-focused use case.

### 1. Bento Grid Layout for Gist List

**Decision:** Implement bento grid layout for gist cards with asymmetric proportions.

**Implementation:**

```css
.gist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-auto-flow: dense;
  gap: var(--spacing-4);
}

.gist-card.featured {
  grid-column: span 2;
  grid-row: span 2;
}

@media (min-width: 768px) {
  .gist-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .gist-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**Rationale:**

- Visual hierarchy: featured/starred gists get larger cards
- Apple-inspired pattern (proven in keynotes and product pages)
- CSS Grid subgrid support for consistent alignment
- Asymmetric layout feels modern, editorial, curated

### 2. Glassmorphism 2.0 for Navigation

**Decision:** Apply `backdrop-filter: blur()` to navigation elements and modals, not content cards.

**Implementation:**

```css
.sidebar-nav,
.rail-nav {
  background: rgba(22, 22, 23, 0.8);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-drawer {
  background: rgba(22, 22, 23, 0.85);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}
```

**Rationale:**

- Creates depth and hierarchy without visual noise
- Communicates floating elements above surface
- GPU-accelerated in all major browsers (2026)
- WCAG contrast maintained with semi-opaque backgrounds

### 3. Dark Mode First Workflow

**Decision:** Redesign with dark theme as primary, light as secondary.

**Implementation:**

```css
:root {
  /* Dark mode (default) */
  --color-background-base: #030303;
  --color-background-elevated: #0a0a0a;
  --color-text-primary: #ededed;
  --color-border-default: rgba(255, 255, 255, 0.1);
}

[data-theme='light'] {
  --color-background-base: #ffffff;
  --color-background-elevated: #f5f5f5;
  --color-text-primary: #1a1a1a;
  --color-border-default: rgba(0, 0, 0, 0.1);
}
```

**Rationale:**

- 80% of mobile users keep dark mode enabled
- OLED screens benefit from true blacks (battery savings)
- Modern SaaS/developer tools ship dark by default
- Semantic tokens make theme switching trivial

### 4. Spring Physics with CSS linear()

**Decision:** Replace cubic-bezier with CSS `linear()` for spring-like motion.

**Implementation:**

```css
:root {
  /* Spring-like easing without JS */
  --ease-spring-out: linear(
    0,
    0.009,
    0.035 2.1%,
    0.141 4.4%,
    0.723 12.9%,
    0.938,
    1.058,
    1.072,
    1.074,
    1.065,
    1.048,
    1.026,
    1.007,
    0.995,
    0.988
  );
}

.gist-card:hover {
  transform: translateY(-2px);
  transition: transform 300ms var(--ease-spring-out);
}
```

**Rationale:**

- More natural, tactile feel than cubic-bezier
- CSS-native (no JS library needed)
- Performant on GPU
- Aligns with 2026 motion design trends

### 5. Scroll-Driven Animations (Where Appropriate)

**Decision:** Use CSS `animation-timeline: scroll()` for reveal animations.

**Implementation:**

```css
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gist-card {
  animation: reveal 0.5s ease-out both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
```

**Rationale:**

- Zero JavaScript for scroll effects
- Native browser optimization
- Reduced main thread load
- Graceful degradation (content still visible without animation)

### 6. Variable Fonts for Performance

**Decision:** Use variable fonts (Inter variable) instead of multiple static font files.

**Implementation:**

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

**Rationale:**

- Single file replaces 4-6 static files
- Reduced page weight (critical for performance budgets)
- Smooth weight transitions (no snap between weights)
- Excellent browser support in 2026

### 7. Performance Budgets (Enforced)

**Decision:** Set strict performance budgets before any design changes.

| Metric                    | Budget  | Current Target       |
| ------------------------- | ------- | -------------------- |
| Largest Contentful Paint  | < 1.8s  | 1.5s                 |
| Interaction to Next Paint | < 150ms | 100ms                |
| Cumulative Layout Shift   | < 0.05  | 0.02                 |
| Total Bundle Size         | < 150KB | 120KB                |
| Font Files                | < 50KB  | 30KB (variable font) |
| Animation Frame Rate      | 60fps   | 60fps                |

**Implementation:**

```json
// .lighthouserc.js
module.exports = {
  ci: {
    assert: {
      assertions: {
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
        'interaction-to-next-paint': ['error', { maxNumericValue: 150 }],
        'total-byte-weight': ['error', { maxNumericValue: 150000 }],
      }
    }
  }
};
```

### 8. Context-Aware Theming (Future Enhancement)

**Decision:** Plan for context-aware theming beyond dark/light.

**Concept:**

```typescript
type ThemeContext =
  | { mode: 'time-based'; hour: number }
  | { mode: 'ambient-light'; lux: number }
  | { mode: 'content-type'; type: 'code' | 'readme' | 'diff' }
  | { mode: 'user-preference'; theme: 'dark' | 'light' | 'auto' };

function resolveTheme(context: ThemeContext): Theme {
  // Auto-switch based on context
}
```

**Rationale:**

- Adaptive interfaces are 2026 trend
- Reduces eye strain (bright environments → light mode)
- Enhances code readability (code-heavy views → darker)
- User control maintained (can override auto)

### 9. Button Styles: Token-Driven, Emoji-Free

**Decision:** All buttons use semantic design tokens, no emojis/icons, with micro-interactions and WCAG 2.2 AA compliance.

**Implementation:**

```css
.btn {
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-weight: var(--font-weight-medium);
  transition:
    transform 200ms var(--ease-spring-out),
    background 200ms ease;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
}

.btn:hover {
  transform: translateY(-1px);
  background: var(--color-bg-hover);
}

.btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-color: var(--color-primary);
}
```

**Rationale:**

- 2026 best practice prohibits emojis/icons in functional UI buttons
- Token-driven design ensures consistency across themes
- Micro-interactions (spring physics) enhance tactile feel
- WCAG 2.2 AA compliance for accessibility
- Mobile-first sizing for touch targets (min 44x44px)

## Consequences

### Positive

- Modern, premium feel with bento grids and glassmorphism
- Better performance with variable fonts and scroll-driven animations
- Improved accessibility with dark mode first (reduces eye strain)
- Natural motion with spring physics
- Future-proof with context-aware theming architecture
- Reduced bundle size through performance budgets

### Negative

- Additional CSS complexity (glassmorphism, bento grids)
- Learning curve for CSS `linear()` and `animation-timeline`
- Variable fonts may need fallback for older browsers
- Context-aware theming requires sensor APIs (privacy considerations)

### Mitigations

- Progressive enhancement (effects layer on top of functional base)
- Feature detection before using modern APIs
  -Performance budgets prevent bloat
- Fallbacks for browsers without variable font support
- User control preserved (auto-theming is opt-in)

## Implementation Priority

| Priority | Feature                    | Effort | Impact |
| -------- | -------------------------- | ------ | ------ |
| P0       | Dark mode first            | Low    | High   |
| P0       | Variable fonts             | Low    | Medium |
| P0       | Button styles (emoji-free) | Low    | High   |
| P1       | Bento grid layout          | Medium | High   |
| P1       | Glassmorphism nav          | Low    | Medium |
| P1       | Performance budgets        | Low    | High   |
| P2       | Spring physics             | Medium | Medium |
| P2       | Scroll-driven animations   | Medium | Low    |
| P3       | Context-aware theming      | High   | Medium |

## References

- [Webfx: Top UX/UI Trends 2026](https://www.webfx.com/blog/web-design/ux-ui-trends/)
- [StudioLimb: Modern Web Design Essentials 2026](https://www.studiolimb.com/guides/modern-web-design-essentials.html)
- [Midrocket: UI Design Trends 2026](https://midrocket.com/en/guides/ui-design-trends-2026/)
- [Seamonster Coding: 7 Web Design Trends 2026](https://seamonstercoding.com/blog/web-design-trends-2026)
- [MDN: View Transitions API](https://developer.mozilla.org/docs/Web/API/View_Transition_API)
- [CSS Tricks: CSS linear() easing](https://css-tricks.com/linear-easing-functions/)
- [MDN: animation-timeline](https://developer.mozilla.org/docs/Web/CSS/animation-timeline)

## Related ADRs

- ADR-007: UI/UX Modernization (implemented)
- ADR-008: Web Vitals Performance Budgets
- ADR-003: Design Token Architecture

---

_Created: 2026-05-06. Status: Proposed. Deciders: UI/UX Agent, Performance Engineer_
