# AGENTS.md (2026 Edition)

> Offline-first GitHub Gist management.
> Stack: pnpm, Vite 8, TypeScript 6, Biome, Playwright, Vitest, Capacitor 8.

## Agent Workflow
1. **Analyze**: Read `README.md` and relevant `src/` files.
2. **Execute**: Use `pnpm` exclusively. No `npm`. No `yarn`.
3. **Verify**: Run tests and linting.
4. **Commit**: Pass `./scripts/quality_gate.sh`.

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
- **Tools**: Format and Lint with Biome (`pnpm run lint:fix`).
- **Commits**: Conventional Commits only (`feat:`, `fix:`, `chore:`, etc.).
- **Style**: Direct, professional. No conversational filler or emojis in generated documentation.

## Architecture
- `src/config/app.config.ts`: Single source of truth for app identity.
- `src/services/db.ts`: IndexedDB source of truth for offline-first architecture.
- `VERSION` file: Canonical version string.

## Skills & Capabilities
Consult `.agents/skills/` for specific modular agentic workflows. Avoid large monolithic prompts; use standard file execution.
