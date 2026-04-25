<!-- Last Audit: 2026-04-25 -->
# ADR-007: UI/UX Modernization with 2026 Best Practices v2

## Status

Accepted → Implemented

## Context

The d.o. Gist Hub UI was built with 2025 patterns and needed modernization to match 2026 best practices. A screenshot analysis revealed critical issues:

- Full viewport menu overlay (100% screen takeover)
- No visual hierarchy or section grouping
- Zero responsive breakpoint adaptation
- Missing interactive states and accessibility
- Hardcoded styling without design tokens

The `reader-ui-ux` skill v2.0.0 provides comprehensive guidance for View Transitions API, container queries, sophisticated motion design, and modern navigation patterns.

## Decision

We will modernize the UI following the updated `reader-ui-ux` skill patterns with a mobile-first, 7-breakpoint responsive system.

### 1. Layout: Container Queries + Media Queries Hybrid

**Decision:** Use container queries for component-level responsive behavior, media queries for page-level layout and navigation mode switching.

**Rationale:**
- Components adapt to their container, not just viewport
- Navigation mode must adapt to viewport width
- Better reusability across different contexts
- Future-proof as container queries have excellent browser support (2026)

### 2. Navigation: Viewport-Adaptive with 3 Modes

**Decision:** Implement three navigation patterns based on viewport:

| Viewport | Pattern | Width |
|----------|---------|-------|
| Mobile (320-767px) | Bottom sheet drawer | 100% width, 70vh max-height |
| Tablet (768-1023px) | Navigation rail | 72px fixed width |
| Desktop (1024px+) | Persistent sidebar | 240px (280px on 1536px+) |

**Rationale:**
- Optimized for each form factor
- Touch targets appropriate for each device
- Progressive disclosure of navigation options
- Mobile-first CSS: base styles hide sidebar, show bottom nav

### 3. Motion: Purposeful and Performant

**Decision:** Implement professional motion design with:

- Token-driven durations (100ms-400ms)
- Cubic-bezier easing functions (out-expo for entrances, in-expo for exits)
- GPU-accelerated properties only (transform, opacity)
- Respects `prefers-reduced-motion`
- Micro-interactions: hover (translateY -2px), active (scale 0.98)

**Rationale:**
- 60fps animations enhance perceived performance
- Proper easing feels more natural
- Accessibility compliance requires reduced motion support
- Touch feedback improves perceived responsiveness

### 4. Visual Hierarchy: Section Grouping

**Decision:** Implement clear visual hierarchy with grouped sections:

```
NAVIGATION
├── Primary Actions (Home, Starred, Create)
├── Secondary (Offline Status, Sync Queue)
└── System (Preferences, Data & Diagnostics, Settings)
```

**Rules:**
- Section titles: uppercase, xs font, tertiary color, letter-spacing
- Dividers between sections using border tokens
- Active items: accent background + text color
- Icons + labels on desktop, icons only on rail

### 5. Accessibility: First-Class Citizen

**Decision:** Implement comprehensive accessibility:

- Focus traps for modals/drawers with keyboard navigation
- ARIA live regions for dynamic content
- Skip links for keyboard navigation
- Screen reader optimized markup with landmarks
- Visible focus indicators (2px outline, offset)
- Touch targets minimum 44x44px (56px+ on mobile)

**Rationale:**
- Legal compliance (WCAG 2.2 AA)
- Ethical obligation for inclusive design
- Better SEO and usability for all users

### 6. Safe Area Support

**Decision:** Full safe area support for notched devices:

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}
```

Applied to navigation containers, headers, and bottom sheets.

### 7. Dynamic Viewport Units

**Decision:** Use `dvh` (dynamic viewport height) for app shell:

```css
.app-shell {
  min-height: 100dvh;
  min-height: 100vh; /* Fallback */
}
```

Prevents layout issues on mobile browsers with dynamic UI (address bar show/hide).

## Consequences

### Positive

- Modern, professional appearance with clear visual hierarchy
- Improved perceived performance with smooth animations
- Better accessibility compliance (WCAG 2.2 AA target)
- Future-proof code patterns (container queries, View Transitions)
- Consistent experience across all 7 breakpoints
- No unstyled elements at any viewport

### Negative

- Increased CSS complexity (4 navigation modes + container queries)
- Additional JavaScript for focus management and keyboard nav
- View Transitions API requires fallback handling
- Tablet rail navigation (72px) has limited space for labels

### Mitigations

- Progressive enhancement approach
- Feature detection before using modern APIs
- Comprehensive testing across all 7 breakpoints
- Reduced motion media query support

## Implementation

See `plans/plan-ui-ux-modernization.md` for detailed implementation plan.
See `plans/017-ui-ux-navigation-overhaul.md` for navigation-specific details.
See `plans/004-responsive-system.md` for 7-breakpoint system specification.

## References

- `.agents/skills/reader-ui-ux/SKILL.md` - Updated skill definition
- `.agents/skills/reader-ui-ux/references/` - Detailed implementation guides
- `plans/004-responsive-system.md` - 7-breakpoint responsive system
- `plans/017-ui-ux-navigation-overhaul.md` - Navigation overhaul plan
- `agents-docs/patterns/mobile-first-navigation.md` - Navigation patterns
- `agents-docs/patterns/dynamic-viewport-units.md` - dvh usage
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries
- https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API

---

*Updated: 2026-04-25. Status: Implemented.*
