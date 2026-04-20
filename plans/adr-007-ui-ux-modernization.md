<!-- Last Audit: 2024-05-15 -->
# ADR-007: UI/UX Modernization with 2026 Best Practices

## Status

Proposed → Accepted

## Context

The d.o. Gist Hub UI was built with 2025 patterns and needs modernization to match 2026 best practices. The `reader-ui-ux` skill has been updated to v2.0.0 with comprehensive guidance for:

- View Transitions API for smooth page transitions
- Container queries for component-level responsiveness
- Sophisticated motion design with proper easing
- Modern navigation patterns (sheet, rail, sidebar)
- Comprehensive accessibility improvements

## Decision

We will modernize the UI following the updated `reader-ui-ux` skill patterns:

### 1. Layout: Container Queries First

**Decision:** Use container queries for component-level responsive behavior, media queries for page-level layout.

**Rationale:**

- Components adapt to their container, not just viewport
- Better reusability across different contexts
- Future-proof as container queries have excellent browser support (2026)

### 2. Motion: Purposeful and Performant

**Decision:** Implement professional motion design with:

- Token-driven durations (150ms-400ms)
- Cubic-bezier easing functions
- GPU-accelerated properties only (transform, opacity)
- Respects `prefers-reduced-motion`

**Rationale:**

- 60fps animations enhance perceived performance
- Proper easing feels more natural
- Accessibility compliance requires reduced motion support

### 3. Navigation: Viewport-Adaptive

**Decision:** Implement three navigation patterns:

- Mobile (320-767px): Bottom tab bar + sheet drawers
- Tablet (768-1023px): Navigation rail (72px)
- Desktop (1024px+): Persistent sidebar (240px)

**Rationale:**

- Optimized for each form factor
- Touch targets appropriate for each device
- Progressive disclosure of navigation options

### 4. Accessibility: First-Class Citizen

**Decision:** Implement comprehensive accessibility:

- Focus traps for modals/drawers
- ARIA live regions for dynamic content
- Skip links for keyboard navigation
- Screen reader optimized markup

**Rationale:**

- Legal compliance (WCAG 2.2 AA)
- Ethical obligation for inclusive design
- Better SEO and usability for all users

## Consequences

### Positive

- Modern, professional appearance
- Improved perceived performance
- Better accessibility compliance
- Future-proof code patterns

### Negative

- Increased CSS complexity (container queries)
- Additional JavaScript for focus management
- View Transitions API requires fallback handling

### Mitigations

- Progressive enhancement approach
- Feature detection before using modern APIs
- Comprehensive testing across breakpoints

## Implementation

See `plans/plan-ui-ux-modernization.md` for detailed implementation plan.

## References

- `.agents/skills/reader-ui-ux/SKILL.md` - Updated skill definition
- `.agents/skills/reader-ui-ux/references/` - Detailed implementation guides
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries
- https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
