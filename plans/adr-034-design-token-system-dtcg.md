# ADR-034: DTCG-Aligned Design Token System

> **Status**: Accepted
> **Type**: ADR
> **Created**: 2026-06-16
> **Owner**: agent
> **Related**: adr-001, adr-022, 003-design-token-architecture.md, 070-goap-design-token-system-audit-and-cleanup.md

## Context

The project inherited a design token system from the upstream `do-gemini` template (ADR-001) and progressively expanded it through multiple modernization sprints (plans 026, 039, 040, 042, 066, 069). The token system now spans 6 layers (primitive, semantic, component, responsive, motion, elevation) with dual-theme support, OKLCH accent ramp, and Style Dictionary pipeline.

However, the system accumulated inconsistencies across multiple contributors:
- Recursive self-referencing tokens (`--spacing-N: var(--spacing-N)`) in `css-variables.ts` — dead code
- Mixed naming conventions (`--spacing-vN` generated vs `--space-N` bridge aliases)
- Missing token documentation reflecting the full implementation
- No formal ADR recording the architecture decision for the DTCG-aligned token system

## Decision

Formalize the DTCG-aligned design token system as the canonical token architecture with these properties:

### 1. DTCG Format as Source of Truth
All token definitions use DTCG-style JSON (`$type`, `$value`, `$description`) in `src/tokens/*.tokens.json`. This ensures portability and tool interoperability.

### 2. Style Dictionary Pipeline
Token compilation uses Style Dictionary to generate:
- `src/styles/generated/tokens.css` — CSS custom properties (imported by `base.css`)
- `src/tokens/generated/tokens.ts` — TypeScript exports (used by component token modules)

### 3. Six-Layer Architecture
| Layer | Purpose | Source |
| --- | --- | --- |
| Primitive | Raw values | `primitives.tokens.json` |
| Semantic | Meaningful names | `semantic.tokens.json` |
| Component | Component-specific | `component/*.ts` (derived from generated) |
| Responsive | Breakpoint-aware | `responsive/breakpoints.ts` |
| Motion | Animation curves | `motion/motion.ts` |
| Elevation | Shadows, z-index | `elevation/shadows.ts` |

### 4. Dark Mode First
`:root` defaults to dark theme. `[data-theme="light"]` overrides semantic tokens. No separate dark/light token files — theme switching is a property override.

### 5. OKLCH Accent Ramp
Accent color uses perceptually uniform OKLCH space with user-tunable hue (`--accent-h`). `color-mix()` generates tints. Hex fallbacks in `@supports` blocks for older engines.

### 6. Bridge Aliases for Backward Compatibility
Legacy short names (`--space-N`, `--text-*`, `--color-bg`) are maintained as aliases to generated tokens. A cleanup pass will remove the dead recursive `--spacing-N` layer.

## Consequences

### Positive
- **Portable**: DTCG JSON is tool-agnostic; any DTCG-compatible tool can consume the tokens
- **Maintainable**: Single source of truth per token layer; no manual CSS property management
- **Themeable**: Dark-first with automatic light mode via property overrides
- **Performant**: CSS custom properties are resolved at paint time; no JS theme switching overhead
- **Accessible**: OKLCH ensures perceptually uniform contrast; WCAG AA validated

### Negative
- **Complexity**: 6-layer architecture is more complex than flat token files
- **Dead code**: Recursive `--spacing-N` aliases persist until cleanup pass (GOAP 070)
- **Tooling dependency**: Style Dictionary pipeline must be maintained

### Risks
- Style Dictionary version upgrades may change output format (mitigated by pinning)
- OKLCH browser support gaps handled by `@supports` fallbacks

## Alternatives Considered

1. **Flat CSS variables** — simpler but no DTCG portability or tool support
2. **CSS-in-JS tokens** — runtime overhead, no offline-first benefit
3. **Tailwind-style config** — vendor lock-in, less control over output

## References

- [Design Tokens Community Group](https://www.designtokens.org/)
- ADR-001: Design token reuse from do-gemini
- ADR-022: 2026 UI trends integration (OKLCH, variable fonts)
- Plan 003: Design token architecture
- Plan 039: UI/UX 2026 modernization
- Plan 040: Phase B/C completion (@scope, OKLCH shadows)
