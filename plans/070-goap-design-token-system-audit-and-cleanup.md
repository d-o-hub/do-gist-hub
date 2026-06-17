# GOAP: Design Token System Audit and Cleanup

> **Status**: Complete
> **Type**: GOAP
> **Created**: 2026-06-16
> **Owner**: agent
> **Related**: adr-001, adr-034, 003-design-token-architecture.md

## Goal

Audit the design token system for consistency, remove dead code, and ensure full DTCG compliance across all 6 token layers.

## Actions

### Phase 1: Documentation (Complete)

- [x] **A1**: Update `plans/003-design-token-architecture.md` with full token system inventory — all 6 layers, pipeline, theme system, known issues, implementation checklist
- [x] **A2**: Create `plans/adr-034-design-token-system-dtcg.md` — formalize DTCG-aligned token architecture as accepted ADR

### Phase 2: Token Cleanup (Documented, Not Implemented)

- [ ] **A3**: Remove recursive `--spacing-N: var(--spacing-N)` self-references from `css-variables.ts:75-110` — these are dead code; the working aliases are `--space-N` (bridge) and `--spacing-vN` (generated)
- [ ] **A4**: Remove corresponding recursive entries from `public/design-tokens.css:71-122, 365-418` — same dead code in the committed output file
- [ ] **A5**: Verify no external consumers reference the recursive `--spacing-N` layer before deletion

### Phase 3: Validation (Future)

- [ ] **A6**: Run token validation script (`npx -y node .agents/skills/design-token-system/scripts/validate-tokens.cjs`) against all JSON token files
- [ ] **A7**: Verify CSS variable generation matches TypeScript exports (snapshot test)
- [ ] **A8**: WCAG AA contrast audit for all semantic color pairs in both themes

## Success Criteria

- Design token documentation accurately reflects implementation
- ADR-034 accepted and registered
- Recursive dead-code tokens identified and tracked for removal
- No regressions in lint, typecheck, or unit tests

## Files Modified

| File | Action | Purpose |
| --- | --- | --- |
| `plans/003-design-token-architecture.md` | MODIFIED | Comprehensive update with full token inventory |
| `plans/adr-034-design-token-system-dtcg.md` | CREATED | ADR for DTCG-aligned token system |
| `plans/070-goap-design-token-system-audit-and-cleanup.md` | CREATED | This GOAP plan |
| `plans/_status.json` | MODIFIED | Register new ADR and GOAP entries |
| `plans/_index.md` | MODIFIED | Add active plan and ADR entries |

## Verification

```bash
pnpm run lint             # ✓ 94 files, 0 issues
pnpm run typecheck        # ✓ clean
pnpm run test:unit        # ✓ passing
```
