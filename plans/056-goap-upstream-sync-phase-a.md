# 056 — GOAP: Upstream Sync Phase A — Script Hardening (P0)

> **Date**: 2026-05-26
> **Type**: GOAP Plan
> **Status**: Active
> **Related**: `054-upstream-template-impact-analysis.md`, `adr-015-upstream-template-adaptation.md`

---

## Context

Plan 054 analyzed the delta between our repo and upstream `github-template-ai-agents v0.2.9`. Phase A was identified as **P0 priority**: port injection fixes from upstream shell scripts to our local equivalents. Upstream templates received security hardening against option injection and structural injection vulnerabilities.

**Current scripts** (17 in `scripts/`):
- `quality_gate.sh` — Main CI quality gate
- `pre-commit-hook.sh`, `commit-msg-hook.sh` — Git hooks
- `validate-skills.sh` — Skill validation
- `check-bundle-size.sh`, `check-plan-numbering.sh`, `check-adr-compliance.sh` — CI validations
- `sha-pin-actions.sh`, `analyze-codebase.sh`, `archive-stale-plans.sh` — Automation
- `build-fdroid-apk.sh`, `submit-to-fdroid.sh`, `generate-keystore.sh`, `setup-skills.sh` — Build/publish
- `run_act_local.sh`, `self-fix.sh`, `autosearch-issues.sh` — Utilities

---

## Goals

### Goal 1: Shell Injection Hardening (P0)

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 1 | Audit all 17 scripts for unquoted variables, unsafe `eval`, unescaped input | None | Baseline security inventory | S |
| 2 | Add `set -euo pipefail` to any scripts missing it | Audit complete | Fail-fast on errors | XS |
| 3 | Quote all variable expansions (`"$var"` not `$var`) | Audit complete | No word-splitting injection | M |
| 4 | Replace `ls` parsing with glob patterns (`for f in *.sh`) | Audit complete | No filename injection | S |

### Goal 2: ShellCheck Zero-Tolerance (P1)

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 5 | Run `shellcheck` on all 17 scripts, fix all warnings | Goal 1 done | Zero ShellCheck violations | M |
| 6 | Add `.shellcheckrc` with project conventions | ShellCheck fixes done | Configurable lint rules | XS |
| 7 | Wire ShellCheck into CI (`ci.yml` or `yaml-lint.yml`) | ShellCheck fixes done | CI blocks new violations | XS |

### Goal 3: Validation & CI (P1)

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 8 | Add `shellcheck` step to `ci.yml` | Goal 2 done | Enforced on every PR | XS |
| 9 | Add shfmt (formatting) check to pre-commit hook | Goal 2 done | Consistent script formatting | XS |

---

## Success Criteria

- `shellcheck scripts/*.sh` — zero warnings
- `set -euo pipefail` present in all 17 scripts
- All variable expansions properly quoted
- CI blocks PRs with ShellCheck violations

---

## Plan Registry

- Register this plan in `_status.json`, `_index.md`, and `README.md`
- Next available plan: `057`
