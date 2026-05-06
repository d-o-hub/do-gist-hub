# Autonomous Optimization

Self-learning system that analyzes, detects, fixes, and documents issues automatically.

## Scripts

| Script                 | Purpose                     | Usage                      |
| ---------------------- | --------------------------- | -------------------------- |
| `analyze-codebase.sh`  | Full analysis with auto-fix | `--fix --validate --watch` |
| `autosearch-issues.sh` | Pattern-based detection     | Detects CSS/TS/HTML issues |
| `self-fix.sh`          | Apply known fixes           | `--dry-run` to preview     |

## Detection Patterns

| Pattern                    | Issue                                 | Severity |
| -------------------------- | ------------------------------------- | -------- |
| `css_missing_base_display` | Element visible when should be hidden | High     |
| `css_no_dvh`               | Using 100vh instead of 100dvh         | Medium   |
| `css_hardcoded_colors`     | Hardcoded hex colors                  | Low      |
| `ts_any_type`              | TypeScript `any` usage                | Medium   |
| `html_unstyled_button`     | Button without CSS class              | High     |

## Self-Learning Database

```
agents-docs/
├── patterns/     # Good/bad patterns
├── issues/       # Documented issues
├── fixes/        # Verified fixes
└── detected/     # Auto-detected issues
```

## Pre-Commit Hook

```bash
#!/bin/bash
./scripts/analyze-codebase.sh --pre-commit || exit 1
./scripts/quality_gate.sh || exit 1
```

See `.agents/skills/codebase-optimizer/SKILL.md` for details.
