# Upstream Template Adaptation Plan

> **Date**: 2026-04-28
> **Source**: https://github.com/d-o-hub/github-template-ai-agents
> **Purpose**: Track upstream features to adapt for d.o. Gist Hub coding workflow

---

## 1. Upstream Features Inventory

The upstream template provides a **unified harness for AI coding agents** with these capabilities:

- Multi-agent support (Claude Code, Gemini CLI, OpenCode, Qwen Code, Windsurf, Cursor, Copilot Chat)
- Skills system with canonical location (`.agents/skills/`)
- Quality gates (lint, test, format before commits)
- Context discipline (sub-agents, hooks, back-pressure)
- Dependabot integration (automated security + version updates)
- Pre-commit framework (gitleaks, shellcheck, markdownlint)
- Local GitHub Actions testing (`nektos/act`)
- Auto-labeling, stale issue management, version propagation

---

## 2. Adaptation Matrix

### 2.1 Direct Ports (Minimal Customization)

| Upstream File | Destination | Customization Needed | Priority |
|--------------|-------------|---------------------|----------|
| `.gitleaks.toml` | Root | Add `public/` and `scripts/` to allowlist if needed | P0 |
| `.pre-commit-config.yaml` | Root | Adjust file paths for TS/CSS; keep gitleaks, shellcheck, markdownlint | P0 |
| `commitlint.config.cjs` | Root | May need `.js` variant (repo uses ESM); same rules | P0 |
| `.yamllint.yml` | Root | Same config; validates GitHub Actions | P1 |
| `markdownlint.toml` | Root | Same config; disables MD041, MD032, MD033 for agent docs | P1 |
| `.actrc` | Root | Same config; `ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest` | P1 |
| `scripts/run_act_local.sh` | `scripts/` | Update `DEFAULT_WORKFLOW_FILE` to `.github/workflows/ci.yml` | P1 |
| `scripts/lib/skill-validation.sh` | `scripts/lib/` | Same logic; validate 24 existing skills | P1 |
| `SECURITY.md` | Root | Add PAT-specific security considerations | P0 |
| `QUICKSTART.md` | Root | Replace with Node.js/pnpm/npm setup instead of pip | P0 |
| `CHANGELOG-TEMPLATE.md` | Root | Same format | P1 |

### 2.2 Workflow Ports

| Upstream Workflow | Destination | Customization Needed | Priority |
|------------------|-------------|---------------------|----------|
| `security-scan.yml` | `.github/workflows/` | Add Node.js setup; keep shellcheck (SARIF), Trivy, GitLeaks | P0 |
| `commitlint.yml` | `.github/workflows/` | Same logic; validate conventional commits on PR | P0 |
| `yaml-lint.yml` | `.github/workflows/` | Add Node.js setup for actionlint; same yamllint | P1 |
| `dependabot-auto-merge.yml` | `.github/workflows/` | Same logic; auto-merge minor/patch npm updates | P1 |
| `stale.yml` | `.github/workflows/` | Same logic; 60 days label, 7 days close | P2 |
| `labeler.yml` | `.github/workflows/` | Create `.github/labeler.yml` with paths for `src/`, `scripts/`, `.agents/` | P2 |
| `cleanup.yml` | `.github/workflows/` | Same logic; detect unused scripts, broken symlinks | P2 |
| `version-propagation.yml` | `.github/workflows/` | Propagate VERSION to README.md, QUICKSTART.md, CHANGELOG.md | P2 |

### 2.3 Documentation Ports

| Upstream Doc | Destination | Customization Needed | Priority |
|-------------|-------------|---------------------|----------|
| `agents-docs/HARNESS.md` | `agents-docs/` | Document Vite/TS/IndexedDB/Capacitor harness instead of Python/shell | P1 |
| `agents-docs/SKILLS.md` | `agents-docs/` | Reference 24 existing skills; same authoring guidelines | P1 |
| `agents-docs/SUB-AGENTS.md` | `agents-docs/` | Adapt examples to gist CRUD, token system, sync features | P1 |
| `agents-docs/HOOKS.md` | `agents-docs/` | Same patterns; add Vite-specific hooks if any | P2 |
| `agents-docs/CONTEXT.md` | `agents-docs/` | Same back-pressure mechanisms | P2 |
| `agents-docs/CONFIG.md` | `agents-docs/` | Document `app.config.ts` as single source of truth | P2 |
| `agents-docs/MIGRATION.md` | `agents-docs/` | Guide for adopting token system in existing components | P2 |
| `agents-docs/AVAILABLE_SKILLS.md` | `agents-docs/` | Auto-generate from `.agents/skills/` directory | P1 |

### 2.4 Agent-Specific Files

| Upstream File | Destination | Content |
|--------------|-------------|---------|
| `GEMINI.md` | Root | `@AGENTS.md` (overrides only) |
| `QWEN.md` | Root | `@AGENTS.md` (overrides only) |
| `OPENCODE.md` / `opencode.json` | Root | Configuration for OpenCode agent |

---

## 3. Not Adapting (Intentionally Omitted)

| Upstream Feature | Reason |
|-----------------|--------|
| `.github/workflows/ci-and-labels.yml` (unified) | Current repo has separate `ci.yml`, `cd.yml`, `release.yml` — prefer granular workflows |
| `scripts/gh-labels-creator.sh` | GitHub labels already configured; low value |
| `scripts/propagate-version.sh` | Can be inlined in version-propagation workflow |
| `agents-docs/ACT.md` | Can be covered in `HARNESS.md` or `CONTRIBUTING.md` |
| `.cursor/rules/` | Cursor-specific; not currently used |
| `.windsurf/rules/` | Windsurf-specific; not currently used |
| `.jules/` content | Jules-specific; current files are minimal and adequate |

---

## 4. Customizations for d.o. Gist Hub

### 4.1 Pre-commit Config Adjustments

```yaml
# Additional hooks for TypeScript project
repos:
  - repo: local
    hooks:
      - id: quality-gate
        name: Run quality gate
        entry: ./scripts/quality_gate.sh
        language: script
        pass_filenames: false
        always_run: true
```

- Add `check-json`, `check-toml` for Vite/TS config files
- Keep `check-added-large-files` at 500KB (matches AGENTS.md `FILE_SIZE_LIMIT_SOURCE`)
- `gitleaks` hook essential for PAT-handling codebase

### 4.2 Security.md Customizations

- Add section: "PAT Security" — tokens encrypted at rest, never logged, auto-redaction
- Add section: "CSP Disclosure" — strict CSP policy, no `unsafe-eval`
- Add section: "Android Keystore" — planned migration from Web Crypto (v1.x)

### 4.3 Quickstart.md Customizations

Replace upstream Python/pip setup with:

```bash
# Prerequisites
node -v  # Requires Node.js 20+
git --version  # Requires Git 2.30+

# Install
npm install  # or pnpm install
./scripts/setup-skills.sh

# Setup pre-commit (optional but recommended)
pip install pre-commit && pre-commit install
# OR use custom hook:
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

# Verify
./scripts/quality_gate.sh
npm run check
```

---

## 5. Implementation Order

### Phase 1: Foundation (Week 1)
1. `.gitleaks.toml`
2. `.pre-commit-config.yaml`
3. `commitlint.config.cjs` / `.js`
4. `SECURITY.md`
5. SHA-pin all GitHub Actions

### Phase 2: Workflows (Week 1-2)
6. `.github/workflows/security-scan.yml`
7. `.github/workflows/commitlint.yml`
8. `.github/workflows/yaml-lint.yml`
9. `.github/workflows/dependabot-auto-merge.yml`

### Phase 3: Scripts (Week 2)
10. `scripts/lib/skill-validation.sh`
11. Upgrade `scripts/validate-skills.sh`
12. `scripts/run_act_local.sh`
13. `.actrc`

### Phase 4: Documentation (Week 2-3)
14. `QUICKSTART.md`
15. `CHANGELOG.md` + `CHANGELOG-TEMPLATE.md`
16. `GEMINI.md`, `QWEN.md`
17. `agents-docs/HARNESS.md`
18. `agents-docs/SKILLS.md`
19. `agents-docs/SUB-AGENTS.md`
20. `agents-docs/AVAILABLE_SKILLS.md`

### Phase 5: Automation (Week 3-4)
21. `.github/labeler.yml` + workflow
22. `.github/workflows/stale.yml`
23. `.github/workflows/cleanup.yml`
24. `.github/workflows/version-propagation.yml`

---

## 6. Verification Checklist

After each phase:
- [ ] `./scripts/quality_gate.sh` passes
- [ ] `npm run check` passes
- [ ] Pre-commit hooks run successfully (`pre-commit run --all-files`)
- [ ] Security scan workflow passes (test with `act` if available)
- [ ] Skills validation passes (`./scripts/validate-skills.sh`)
- [ ] No unstyled elements at 320px, 768px, 1536px
- [ ] Documentation links are valid (no 404s)

---

*This plan is a living document. Update as upstream template evolves.*
