<!-- Last Audit: 2026-04-25 -->
# ADR-012: Pre-commit Workflow Enhancement

**Status**: Implemented
**Date**: 2026-04-25
**Deciders**: Architect, DevOps Agent

## Context

Current pre-commit workflow relies on a manual bash hook (`scripts/pre-commit-hook.sh`) that runs `quality_gate.sh`. This works but lacks:
- Staged-file-only linting (lints entire `src/` every time)
- Commit message validation
- Automatic formatting of staged files

## Decision

Enhance the pre-commit workflow with `lint-staged` and `@commitlint/config-conventional`.

### New Tools

| Tool | Purpose | Install |
|------|---------|---------|
| `lint-staged` | Lint only staged files | `pnpm add -D lint-staged` |
| `@commitlint/config-conventional` | Enforce conventional commits | `pnpm add -D @commitlint/config-conventional commitlint` |
| `husky` (or simple git hook) | Git hook management | Use existing hook or `pnpm add -D husky` |

### Configuration

**.lintstagedrc.json:**
```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{css,scss}": ["prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

**commitlint.config.js:**
```js
export default { extends: ['@commitlint/config-conventional'] };
```

### Hook Update

Update `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npx lint-staged
./scripts/quality_gate.sh
```

Add `.git/hooks/commit-msg`:
```bash
#!/bin/sh
npx commitlint --edit "$1"
```

## Tradeoffs

### Pros
- Faster pre-commit (only staged files linted)
- Consistent commit messages across team
- Automatic formatting prevents "fix formatting" commits
- Blocks commits with style violations early

### Cons
- Additional dependencies
- Slightly slower first commit (tool installation)
- May conflict with existing hook setup

## Consequences

### Developer Experience
- `git commit` now validates message format
- Staged TypeScript files auto-fixed before commit
- No more "oops, forgot to format" follow-up commits

### CI Alignment
- CI commitlint check ensures PR squash messages are valid
- Pre-commit catches issues before CI runs

## Rejected Alternatives

### Keep current manual hook
**Current state — Rejected because**: Lints entire src/, no commit validation, not enforceable across team.

### Use `simple-git-hooks` instead of husky
**Rejected because**: Project already has hook scripts, can use them directly without new dependency.

## Rollback Triggers

- Tools cause significant commit friction
- Team prefers manual commit message freedom
- Performance impact on large commits unacceptable

## References

- `scripts/pre-commit-hook.sh` — existing hook
- `scripts/quality_gate.sh` — quality gate script
- AGENTS.md: Commit conventions already documented

---

*Created: 2026-04-25. Status: Proposed.*
