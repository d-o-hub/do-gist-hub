# AGENTS.md (2026 Edition)

> Offline-first GitHub Gist management.
> Stack: pnpm, Vite 8, TypeScript 6, Biome, Playwright, Vitest, Capacitor 8.

## Agent Workflow
1. **Analyze**: Read `README.md`, `plans/` (ADRs + progress), and relevant `src/` files.
2. **GOAP First**: Compare ADR decisions vs implementation. Use `plans/adr-026-phase-a-modernization-goap.md` for gap template.
3. **Execute**: Use `pnpm` exclusively. No `npm`. No `yarn`.
4. **Verify**: Run tests and linting.
5. **Commit**: Pass `./scripts/quality_gate.sh`. Conventional Commits only.

## Setup
```bash
pnpm install
pnpm run check
pnpm run test:unit
```

## Validation (Required)
```bash
./scripts/quality_gate.sh
```

## Code Guidelines
- **Strict Types**: No `any`. Explicit returns.
- **No Static-Only Classes**: `export class Foo { static ... }` → `export const Foo = { ... }`. Module-level helpers for private methods. (ADR-026)
- **Tools**: Format and Lint with Biome (`pnpm run lint:fix`).
- **Commits**: Conventional Commits only (`feat:`, `fix:`, `chore:`, etc.).
- **Style**: Direct, professional. No conversational filler or emojis in generated docs.

## Architecture
- `src/config/app.config.ts`: Single source of truth for app identity.
- `src/services/db.ts`: IndexedDB source of truth for offline-first architecture.
- `VERSION` file: Canonical version string.
- `plans/`: ADRs define decisions; progress updates track implementation status.

## Lifecycle Rules (ADR-009)
- **Global Error Handler**: `initGlobalErrorHandling()` MUST be called in `src/main.ts`. Catches uncaught exceptions and unhandled rejections.
- **Route Cleanup**: Call `lifecycle.cleanupRoute()` before navigating to a different route. Cancels in-flight fetch requests via global AbortController.
- **Event Listeners**: Use `AbortController` signal for all `addEventListener` calls where possible.

## Skills & Capabilities
Consult `.agents/skills/` for specific modular agentic workflows. Avoid large monolithic prompts; use standard file execution.

## Reference Files

| File | Content |
|------|---------|
| `agents-docs/ci-maintenance.md` | CI/CD maintenance rules (Node runtime checks, Android SDK, Gradle flags) |
| `agents-docs/self-learning-rules.md` | CSS layout rules, testing patterns, code quality, detection patterns |
| `plans/adr-*-*.md` | Architecture Decision Records with rationale and tradeoffs |
| `plans/025-progress-update-2026-07-18.md` | Latest GOAP gap analysis and P0/P1 fix documentation |
| `.agents/skills/codebase-optimizer/SKILL.md` | Autonomous optimization and self-learning system |

## Verification Checklist
```bash
./scripts/analyze-codebase.sh --validate  # No unstyled elements, correct responsive behavior
pnpm run typecheck                         # TypeScript strict
pnpm run lint                              # Biome zero errors
./scripts/quality_gate.sh                  # Full quality gate
```
