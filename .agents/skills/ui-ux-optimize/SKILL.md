---
name: ui-ux-optimize
description: Optimize UI/UX with design tokens, accessibility, clear user feedback, and mobile-first interactions.
---

# Ui-ux-optimize Skill

Optimize user experience with token-driven design, accessibility, and clear feedback.

## When to Use

- Building new UI components
- Improving accessibility
- Optimizing user flows
- Adding animations and transitions
- Refining mobile interactions

## Accessibility Requirements

### WCAG AA Compliance

See `references/ui-examples.md` for:
- Focus indicators with `:focus-visible`
- Skip links for keyboard navigation
- Reduced motion support (`prefers-reduced-motion`)
- High contrast mode support (`forced-colors`)

### ARIA Attributes

See `references/ui-examples.md` for:
- Accessible button creation with aria attributes
- Proper `aria-disabled`, `aria-busy`, `aria-live`, `aria-label` usage

## Token-Driven Components

See `references/ui-examples.md` for:
- Card component using semantic CSS custom properties
- Token interface (background, borderRadius, padding, shadow, borderColor)

## Clear User Feedback

See `references/ui-examples.md` for:
- Toast notification system (success/error/info)
- Offline indicator with `aria-live` region

## Mobile-First Interactions

Key rules:
- Minimum 44x44px touch targets on touch devices
- Remove hover effects on touch (`@media (hover: none)`)
- Smooth scrolling enabled
- Prevent double-tap zoom

## Motion and Transitions

See `references/ui-examples.md` for:
- Motion token definitions (duration, easing)
- Button transitions with token values
- Loading spinner animation

## Gotchas

- **WCAG AA Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Touch Over Hover**: Design for touch first, hover is secondary
- **Focus Visible**: Use `:focus-visible` not `:focus` for keyboard-only focus
- **Reduced Motion**: Respect `prefers-reduced-motion` preference
- **Safe Feedback**: Don't block user workflow with toasts/modals
- **Token Usage**: All colors/sizes must come from tokens, no hardcoded values
- **Loading States**: Always show loading, never leave user guessing

## Required Outputs

- `src/styles/accessibility.css` - WCAG AA compliance
- `src/styles/interactions.css` - Mobile-first interactions
- `src/styles/motion.css` - Animation tokens
- Accessible component implementations
- User feedback utilities
- Loading state components

## Verification

```bash
# Accessibility audit
npm run test:a11y

# Lighthouse accessibility
npx lighthouse http://localhost:4173 --only-categories=accessibility

# Manual testing
# - Tab through entire app (keyboard navigation)
# - Test with screen reader
# - Test with reduced motion
# - Test on actual mobile device
```

## References

- `AGENTS.md` - Token and responsive design rules
- `design-token-system` skill - Token architecture
- `responsive-system` skill - Responsive behavior
- https://web.dev/ - Web best practices
