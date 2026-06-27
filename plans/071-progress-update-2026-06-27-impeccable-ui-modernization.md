# Progress Update 071 — Impeccable UI Modernization

**Date:** 2026-06-27  
**ADR:** [ADR-028](./adr-028-impeccable-ui-modernization.md)  
**Tool:** [pbakaus/impeccable](https://github.com/pbakaus/impeccable) v3.1.0

## Summary

Installed Impeccable design skill, ran full audit (CLI detector + manual SKILL.md criteria), and implemented all modernization phases in a single pass. `npx impeccable detect src/` now passes with 0 findings.

## Changes

### Tokens & Colors

| File | Change |
|------|--------|
| `src/tokens/motion.tokens.json` | Removed `elastic` easing definition |
| `src/tokens/motion/motion.ts` | Removed `elastic` export |
| `src/tokens/css-variables.ts` | Removed `--motion-easing-elastic` propagation |
| `src/tokens/semantic.tokens.json` | Tinted all neutrals (dark + light) toward brand hue 220° |
| `src/tokens/generated/tokens.ts` | Regenerated |
| `src/styles/generated/tokens.css` | Regenerated |

### CSS

| File | Change |
|------|--------|
| `src/styles/base.css` | Semantic z-index; removed uppercase from `.gist-card-title`, `.detail-title`; added `max-width: 65ch` to `.error-message`, `.form-error` |
| `src/styles/navigation.css` | Semantic z-index; removed backdrop-filter from header/bottom-nav/rail/sidebar; removed uppercase from `.app-title` |
| `src/styles/motion.css` | Replaced glow-pulse with solid `box-shadow` accent; removed dead reduced-motion override; simplified header-collapse keyframes |
| `src/styles/modern-glass.css` | Removed `backdrop-filter: blur(80px)` from `.glass-card`; removed uppercase from `.confirm-title`; added `max-width: 65ch` to `.confirm-message` |
| `src/styles/command-palette.css` | Semantic z-index |
| `src/styles/accessibility.css` | Semantic z-index for skip-link |
| `src/styles/empty-state.css` | `max-width: 65ch` on description |
| `src/styles/conflicts.css` | Removed uppercase from `.conflict-item-title`, `.comparison-title` |

### Tests

| File | Change |
|------|--------|
| `tests/unit/css-variables.test.ts` | Removed elastic from assertion; updated snapshot |

### Docs

| File | Change |
|------|--------|
| `DESIGN.md` | Created — design language document |
| `plans/adr-028-impeccable-ui-modernization.md` | Status → complete |

## Verification

- `npx impeccable detect src/` → **0 findings**
- `pnpm run typecheck` → pass
- `pnpm run lint` → pass
- 1156 tests → all pass
- Coverage → pass

## What Was Not Changed

- **Inter font retained**: provides contrast axis with Anton display; documented as deliberate in DESIGN.md.
- **Generated tokens.css**: still defines the elastic easing variable (auto-generated from now-removed JSON source), but it's inert — no consumer references it and `css-variables.ts` no longer propagates it.
- **Skill version drift warnings**: pre-existing issue with `.agents/skills/` versions (0.1.0 vs repo 0.2.1) — not addressed here.
