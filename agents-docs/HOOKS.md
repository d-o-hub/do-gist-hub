# Hooks Documentation

> Pre-commit, quality gate, CI/CD, and custom hooks for agent-driven development.

## Pre-Commit Hook

### Location

`scripts/pre-commit-hook.sh` — Copy to `.git/hooks/pre-commit` during setup.

### Setup

```bash
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### What It Does

```
1. Global hooks guard
   └── Checks git config core.hooksPath
   └── Fails if global hooks would override local (prevents CI/env conflicts)

2. lint-staged
   └── Runs on staged files only (fast)

3. Quality Gate
   └── ./scripts/quality_gate.sh
       ├── pnpm run typecheck
       ├── pnpm run lint
       ├── pnpm run format:check
       └── ./scripts/validate-skills.sh
```

### Bypass (Emergency Only)

```bash
# Skip global hooks check
SKIP_GLOBAL_HOOKS_CHECK=true git commit -m "..."

# Skip all hooks (not recommended)
git commit --no-verify -m "..."
```

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Global hooks detected" | `git config --global --unset core.hooksPath` |
| Hook blocks commit | Run `./scripts/quality_gate.sh` manually, fix issues, retry |
| Hook not running | Verify `.git/hooks/pre-commit` exists and is executable (`chmod +x`) |

## Quality Gate Hook

### Location

`scripts/quality_gate.sh`

### Execution Flow

```bash
#!/bin/bash
set -euo pipefail

echo "→ Type checking..."
pnpm run typecheck        # strict TypeScript compilation

echo "→ Linting..."
pnpm run lint             # ESLint with project rules

echo "→ Format checking..."
pnpm run format:check     # Prettier consistency

echo "→ Skill validation..."
./scripts/validate-skills.sh  # SKILL.md frontmatter + structure
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All gates passed |
| 1 | One or more gates failed |

**Rule**: Agents must not commit if quality gate exits non-zero.

## CI/CD Hooks

### GitHub Actions Integration

The quality gate runs in CI on every push and PR. Local pre-commit hooks ensure CI rarely fails.

```yaml
# Conceptual CI workflow
jobs:
  quality-gate:
    steps:
      - uses: actions/checkout@v4
      - run: pnpm i
      - run: ./scripts/quality_gate.sh
```

### Optional: Local CI Rehearsal

```bash
# Run GitHub Actions locally with act and Docker
./scripts/run_act_local.sh

# Run only one job
ACT_JOB=quality-gate ./scripts/run_act_local.sh
```

## Custom Hooks

### Adding a Custom Hook

1. **Create the script** in `scripts/hooks/<hook-name>.sh`
2. **Make it executable**: `chmod +x scripts/hooks/<hook-name>.sh`
3. **Integrate into quality gate** or pre-commit hook

### Hook Categories

| Category | Example | Integration Point |
|----------|---------|-------------------|
| **Analysis** | `scripts/analyze-codebase.sh` | Pre-commit, CI, manual |
| **Security** | Secret scanning, CSP validation | Pre-commit, CI |
| **Performance** | Bundle size check, Lighthouse CI | CI, release |
| **Responsive** | Screenshot diff at breakpoints | Manual, release |
| **Memory** | Heap snapshot comparison | CI, manual |

### Example: Responsive Validation Hook

```bash
#!/bin/bash
# scripts/hooks/responsive-check.sh
set -euo pipefail

echo "→ Checking responsive screenshots..."
agent-browser open http://localhost:5173

for size in 320 768 1536; do
  agent-browser set viewport $size 800
  agent-browser screenshot "analysis/responsive/${size}px.png"
done

echo "✓ Responsive screenshots captured"
```

Register in `scripts/quality_gate.sh`:
```bash
# After format check
"$SCRIPT_DIR/hooks/responsive-check.sh" || { echo "✗ Responsive check failed"; exit 1; }
```

### Example: Pre-Push Hook

For checks that are too slow for pre-commit but important before sharing:

```bash
#!/bin/bash
# .git/hooks/pre-push
set -euo pipefail

echo "→ Running pre-push checks..."
./scripts/analyze-codebase.sh --validate
pnpm run test:e2e

echo "✓ Pre-push checks passed"
```

## Agent Hook Responsibilities

| Hook Type | Agent Must... |
|-----------|---------------|
| Pre-commit | Ensure `./scripts/quality_gate.sh` passes before every `git commit` |
| Pre-push | Run full test suite if making significant changes |
| Analysis | Run `./scripts/analyze-codebase.sh --fix` before requesting review |
| Responsive | Capture screenshots at 320px, 768px, 1536px for UI changes |
| Security | Never commit secrets; verify CSP on HTML changes |

## References

- `scripts/pre-commit-hook.sh` — Pre-commit implementation
- `scripts/quality_gate.sh` — Quality gate implementation
- `scripts/analyze-codebase.sh` — Analysis and auto-fix
- `AGENTS.md` — Validation-before-commit rules
