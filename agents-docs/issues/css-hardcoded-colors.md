# Issue: CSS Hardcoded Colors

**Pattern:** `css_hardcoded_colors`
**Severity:** low
**Status:** Open

## Description
Hardcoded color values should use CSS custom properties to ensure consistency with the token-driven design system.

## Files Affected
- `src/styles/accessibility.css`
- `src/styles/navigation.css`
- `src/styles/base.css`

## Suggested Fix
Replace hardcoded hex/rgb colors with semantic or primitive CSS custom properties defined in the token system.

## Verification
- [ ] Issue resolved
- [ ] No regressions introduced
- [ ] Tests pass

## History
- **2026-04-14** — Auto-detected in `/workspaces/do-gist-hub/src/styles/base.css`
- **2026-04-16** — Auto-detected in `/app/src/styles/base.css`
- **2026-04-17** — Auto-detected in `/app/src/styles/base.css`
- **2026-04-29** — Auto-detected in `/home/doswald/git/do-gist-hub/src/styles/accessibility.css` (most recent)

## Related Patterns
- Token Architecture (AGENTS.md)
- `patterns/css-navigation-patterns.md`
