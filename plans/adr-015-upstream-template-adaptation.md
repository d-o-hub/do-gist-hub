# ADR-015: Upstream Template Adaptation Roadmap

## Status

**Accepted** — Phases 1-6 substantially implemented via plans 019 and 038. See implementation notes below.

> **Implementation note (2026-05-17)**: All Phase 1 security items completed (gitleaks, pre-commit, SECURITY.md, SHA-pinned actions, permissions blocks, timeout-minutes). Phase 2 documentation items completed (QUICKSTART.md, CHANGELOG.md, README.md rewrite, CONTRIBUTING.md expansion). Phase 3 CI/CD workflows completed (security-scan.yml, commitlint.yml, yaml-lint, dependabot-auto-merge). Phase 4 scripts completed (validate-skills.sh, skill-validation.sh, run_act_local.sh). Phase 5 agents-docs/ items completed across multiple sprints. Phase 6 automation completed (stale.yml, labeler.yml, cleanup.yml, version-propagation.yml). See plans/019 and plans/038 for detailed tracking.

## Context

The d.o. Gist Hub repository was bootstrapped from the `github-template-ai-agents` template (https://github.com/d-o-hub/github-template-ai-agents). Since initial creation, the upstream template has evolved with new security tooling, CI/CD workflows, documentation standards, and automation features. A swarm analysis on 2026-04-28 identified significant gaps between our current setup and the upstream template.

## Decision

We will systematically adapt upstream template features in phased sprints, prioritizing security and documentation gaps that block contributor onboarding and expose the project to supply-chain or secret-leak risks.

## Consequences

### Positive

- **Security posture improved**: Secret scanning (gitleaks), pre-commit framework, SHA-pinned actions
- **Contributor onboarding accelerated**: QUICKSTART.md, CONTRIBUTING.md expansion, badge visibility
- **CI/CD reliability increased**: Timeouts, permissions blocks, local act testing
- **Documentation completeness**: Missing agent-specific docs, harness docs, skills guide
- **Maintenance automation**: Stale issue management, dependabot auto-merge, version propagation

### Negative

- **Initial overhead**: Creating ~15 new files and updating 3 workflows requires focused effort
- **pre-commit framework dependency**: Contributors need Python/pip installed (or use custom hook fallback)
- **SHA pinning maintenance**: Action updates require manual SHA lookup instead of relying on semver

## Adaptation Phases

### Phase 1: Security Foundation (P0)

| File | Source | Customization |
|------|--------|--------------|
| `.gitleaks.toml` | Upstream | Add `public/`, `tests/`, `agents-docs/`, `plans/` to allowlist |
| `.pre-commit-config.yaml` | Upstream | Add local `quality_gate.sh` hook; keep gitleaks + shellcheck |
| `SECURITY.md` | Upstream | Add PAT-specific sections, CSP disclosure, Android Keystore roadmap |
| SHA-pinned actions | Upstream pattern | Pin all 27 action references in `ci.yml`, `cd.yml`, `release.yml` |
| `permissions` blocks | Upstream pattern | Add least-privilege declarations to all workflows |
| `timeout-minutes` | Upstream pattern | Add to all jobs (10min quality gate, 15min build/visual) |

### Phase 2: Documentation (P0-P1)

| File | Source | Customization |
|------|--------|--------------|
| `QUICKSTART.md` | Upstream | Replace Python/pip with Node.js/npm setup |
| `CHANGELOG.md` | Upstream template | Start with v0.1.0 entry |
| `CHANGELOG-TEMPLATE.md` | Upstream | Same format, add release checklist |
| `GEMINI.md` | Upstream | `@AGENTS.md` pattern |
| `QWEN.md` | Upstream | `@AGENTS.md` pattern |
| `README.md` rewrite | Upstream structure | Badges, "What Is This?", prerequisites, usage examples, community |
| `CONTRIBUTING.md` expansion | Upstream | Dev env, good first issues, PR process, security reporting |

### Phase 3: CI/CD Workflows (P1)

| Workflow | Source | Customization |
|----------|--------|--------------|
| `security-scan.yml` | Upstream | Add Node.js setup; keep shellcheck (SARIF), Trivy, GitLeaks |
| `commitlint.yml` | Upstream | Validate conventional commits on PR/push |
| `yaml-lint.yml` | Upstream | yamllint + actionlint for workflow validation |
| `dependabot-auto-merge.yml` | Upstream | Auto-merge minor/patch npm updates |

### Phase 4: Scripts & Tooling (P1)

| File | Source | Customization |
|------|--------|--------------|
| `scripts/lib/skill-validation.sh` | Upstream | Validate 24 existing skills with frontmatter + line count |
| `scripts/validate-skills.sh` | Upgrade | Use new library pattern |
| `scripts/run_act_local.sh` | Upstream | Update default workflow to `ci.yml` |
| `.actrc` | Upstream | Same config |

### Phase 5: agents-docs/ (P1-P2)

| File | Source | Customization |
|------|--------|--------------|
| `HARNESS.md` | Upstream | Document Vite/TS/IndexedDB/Capacitor harness |
| `SKILLS.md` | Upstream | Reference 24 existing skills |
| `SUB-AGENTS.md` | Upstream | Adapt examples to gist CRUD, token system |
| `AVAILABLE_SKILLS.md` | Auto-generate | Extract from AGENTS.md skills table |
| `HOOKS.md` | Upstream | Add Vite-specific hooks if any |
| `CONTEXT.md` | Upstream | Same back-pressure mechanisms |
| `CONFIG.md` | Upstream | Document `app.config.ts` as single source of truth |
| `MIGRATION.md` | Upstream | Guide for adopting token system in existing code |

### Phase 6: Automation (P2)

| Workflow | Source | Customization |
|----------|--------|--------------|
| `stale.yml` | Upstream | 60 days label, 7 days close |
| `labeler.yml` + workflow | Upstream | Paths for `src/`, `scripts/`, `.agents/` |
| `cleanup.yml` | Upstream | Detect unused scripts, broken symlinks |
| `version-propagation.yml` | Upstream | Propagate VERSION to README, QUICKSTART, CHANGELOG |

## Features Intentionally Omitted

| Feature | Reason |
|---------|--------|
| `.github/workflows/ci-and-labels.yml` (unified) | Current granular workflows preferred |
| `scripts/gh-labels-creator.sh` | Labels already configured |
| `.cursor/rules/`, `.windsurf/rules/` | Not currently used |

## Verification

After each phase:
- `./scripts/quality_gate.sh` passes
- `npm run check` passes
- `pre-commit run --all-files` passes (if using pre-commit framework)
- Skills validation passes
- No unstyled elements at 320px, 768px, 1536px

## References

- Upstream template: https://github.com/d-o-hub/github-template-ai-agents
- Swarm analysis: `plans/019-swarm-analysis-codebase-improvements.md`
- Adaptation plan: `plans/020-upstream-template-adaptation.md`
