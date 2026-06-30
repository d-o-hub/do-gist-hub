---
name: responsive-system
description: Define responsive behavior with 7 breakpoints, mobile-first design, fluid typography, and safe area support.
version: '0.2.1'
template_version: '0.2.1'
---

# Responsive-system Skill

Implement comprehensive responsive design with 7 breakpoints and a mobile-first approach.

## When to Use
- Setting up layout, fluid typography, adapting components, and supporting safe areas.

## Breakpoint Scale (src/tokens/responsive/breakpoints.ts)
| Name | px | Use case |
| --- | --- | --- |
| `phone-small` | 320 | iPhone SE |
| `phone` | 390 | Modern iPhone |
| `phone-large` | 480 | Large phones |
| `tablet-small` | 640 | Small tablets |
| `tablet-portrait`| 768 | iPad portrait |
| `tablet-landscape` | 1024 | iPad landscape |
| `desktop` | 1280 | Laptop |
| `desktop-wide` | 1536 | Ultrawide |

## Key Patterns
- **Pattern 1: Word-break**: `word-break: break-word; overflow-wrap: anywhere;` for long content.
- **Pattern 2: Narrow-phone trim**: Use `(max-width: 389.98px)` to tighten padding/gaps.
- **Pattern 3: Action Collapse**: Collapse action rows to 2-col grid at ≤480px.
- **Pattern 4: Sticky Rail**: sticky rail nav with `height: 100dvh` and safe-area padding.
- **Pattern 5: Comparison Grid**: Viewport-aware grids (1-col on mobile, 2-col on desktop).
- **Pattern 6: Filter Stack**: Stacking filter headers vertically at ≤480px.
- **Pattern 7: Touch Device Awareness**: Hide keyboard-only UI on `(hover: none) and (pointer: coarse)`.
- **Pattern 8: Blur Tokens**: Use `--blur-sm/md/lg/xl/2xl` for all `backdrop-filter` values.
- **Pattern 9: Dialog Accessibility**: `role="dialog"`, `aria-modal`, focus trap, Escape, return-focus.

## Token-Driven Workflow
1. Update `src/tokens/responsive/breakpoints.ts`.
2. Update component tokens in `src/tokens/component/`.
3. Map to CSS variables in `src/tokens/css-variables.ts`.
4. Run `pnpm run build` and update snapshots.

## Gotchas
- Mobile First (320px base).
- No horizontal scroll.
- Use `clamp()` for fluid typography.
- Support `env(safe-area-inset-*)`.
- Maintain 44x44px touch targets.

## Verification
```bash
# Test on viewports: 320, 390, 768, 1024, 1280, 1536
pnpm dev
pnpm run test:mobile
```

## References
- `AGENTS.md`, `design-token-system` skill, web.dev.
