# AGENTS.md

> Offline-first GitHub Gist management.
> Stack: pnpm, Vite 8, TypeScript 6, Biome, Playwright, Vitest, Capacitor 8.

## Agent Workflow

1. **Analyze**: Read `plans/` (ADRs + progress), and relevant `src/` files.
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
- **TypeScript-Only Source**: All source files in `src/` MUST be `.ts` or `.tsx`. No `.js`/`.jsx` files in `src/`. Utility scripts in `scripts/` may use `.js`/`.mjs` (run with `node`).
- **Tools**: Format and Lint with Biome (`pnpm run lint:fix`).
- **Commits**: Conventional Commits only (`feat:`, `fix:`, `chore:`, etc.). Line limits: header 150, body 200, footer 200. Subject must be lowercase (not sentence-case, start-case, or upper-case).
- **Unused Variables**: `noUnusedVariables` is enforced as `"error"` in biome.json. Zero violations.
- **Dark Mode First**: `:root` defaults to dark semantic colors. `[data-theme="light"]` overrides to light. Surface/overlay tokens are theme-aware.
- **SHA-Pinned Actions**: All GitHub Actions use commit SHAs, not floating tags. Run `scripts/sha-pin-actions.sh` to re-pin.
- **Commit-msg Hook**: Install locally to catch format errors before push:
  ```bash
  cp scripts/commit-msg-hook.sh .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg
  ```
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

Consult `.agents/skills/` or `agents-docs/available-skills.md` for the full skill registry. Each agent framework (`.agents/`, `.qwen/`, `.gemini/`) mirrors the same 25 skills. Avoid large monolithic prompts; use standard file execution.

## Reference Files

| File                                                       | Content                                                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `agents-docs/ci-maintenance.md`                            | CI/CD maintenance rules (Node runtime checks, Android SDK, Gradle flags)                |
| `agents-docs/self-learning-rules.md`                       | CSS layout rules, testing patterns, code quality, detection patterns                    |
| `agents-docs/available-skills.md`                          | Full skill registry with descriptions (25 skills)                                       |
| `plans/adr-*-*.md`                                         | Architecture Decision Records with rationale and tradeoffs                              |
| `plans/033-progress-update-2026-05-15-plans-completion.md` | Plans completion sprint — dark mode first, noUnusedVariables, SHA-pinned actions |
| `plans/034-progress-update-swarm-plans-audit.md`            | Plans audit — teardown fix, ADR-022 promoted, plan registry updated |
| `plans/035-progress-update-2026-07-18.md`                   | Swarm followups — ADR cross-check, test audit, AGENTS.md refresh |
| `plans/036-progress-update-2026-07-18.md`                   | Swarm roundup — ADR compliance verified, compacted swarm learnings, agent selection guide |
| `plans/037-progress-update-2026-07-18.md`                   | TRIZ audit, skill registry, compacted doc updates         |
| `.agents/skills/codebase-optimizer/SKILL.md`               | Autonomous optimization and self-learning system                                        |
| `.qwen/skills/` / `.gemini/skills/`                        | 25 skills mirrored across agent frameworks (Qwen, Gemini, Claude)                       |

## Verification Checklist

```bash
./scripts/analyze-codebase.sh --validate  # No unstyled elements, correct responsive behavior
pnpm run typecheck                         # TypeScript strict
pnpm run lint                              # Biome zero errors (noUnusedVariables enforced)
./scripts/quality_gate.sh                  # Full quality gate
```

---

## Swarm Coordination Rules (Compacted from learnings, 2026-07-18)

Compiled from 12 lessons across progress updates 032, 034, 035. Apply these when running multi-agent workflows.

1. **Establish baseline first** — Run quality gate before making changes to detect pre-existing issues.
2. **Fall back when agents fail** — If file-picker errors, use glob + manual mapping directly.
3. **Root cause via code search** — Trace dependency chains (code-searcher) before applying fixes.
4. **Pre-cache mocked modules** — `vi.mock` does not prevent transitive module resolution; use eager `await import()` in `beforeAll`.
5. **ADR status at PR review** — Cross-check ADR status in `_status.json` when merging feature work.
6. **Update AGENTS.md on progress** — Add new progress update entries to reference table immediately.
7. **Local env ≠ CI** — Playwright failures may be local headless issues; check CI results.
8. **`gh pr merge` auto-deletes** — No explicit branch delete needed after merge.

### ADR Status Convention

- **`accepted`**: Architectural decision defining an ongoing pattern (AbortController, IndexedDB, token system).
- **`complete`**: Feature implementation with clear completion criteria (ambient light sensor, UI modernization).

## Self-Learning Rules (Auto-Generated)

This section is automatically updated by `./scripts/analyze-codebase.sh`.

### CSS Layout Rules

1. **Mobile-First Navigation**: Always use `display: none` base style for sidebar
2. **Dynamic Viewport**: Use `100dvh` for app shell on mobile
3. **Safe Areas**: Include `env(safe-area-inset-*)` for header/footer padding
4. **Flex Scrolling**: Add `min-height: 0` to flex children with overflow

### Issue History

See `agents-docs/issues/` for documented issues and fixes.
