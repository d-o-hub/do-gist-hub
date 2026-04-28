# Swarm Analysis: Codebase Improvements & New Features

> **Date**: 2026-04-28  
> **Scope**: Full codebase audit via 5 coordinated swarm agents  
> **Agents**: CI/CD & Scripts | Documentation & README | TRIZ Architecture | Security & Compliance | Feature Completeness

---

## 1. Executive Summary

This document synthesizes findings from a coordinated swarm analysis of the d.o. Gist Hub codebase. Five specialized agents analyzed the repository in parallel, covering CI/CD, documentation, architecture, security, and feature completeness. The codebase is **~85-90% v1-complete** with strong foundations, but has **critical gaps** in security tooling, documentation completeness, and sync architecture that require immediate attention.

### Swarm Handoff Coordination

```
Agent 1 (CI/CD)        ──┐
Agent 2 (Docs)         ──┼──> Synthesis --> plans/019 (this doc)
Agent 3 (TRIZ)         ──┤           --> plans/020 (upstream adaptation)
Agent 4 (Security)     ──┘           --> README.md updates
Agent 5 (Features)     ─────────────> Feature roadmap
```

### Key Metrics

| Category | Critical (P0) | High (P1) | Medium (P2) | Low (P3) |
|----------|--------------|-----------|-------------|----------|
| Security | 6 | 5 | 4 | 2 |
| CI/CD | 4 | 8 | 5 | 3 |
| Documentation | 7 | 5 | 3 | 1 |
| Architecture | 2 | 2 | 4 | 1 |
| Features | 2 | 3 | 3 | 2 |

---

## 2. Critical Findings (P0)

### 2.1 Security Gaps

| Finding | Risk | Evidence |
|---------|------|----------|
| No `.gitleaks.toml` | Secrets committed undetected | Missing file; PAT handling in codebase |
| No `.pre-commit-config.yaml` | No secret scanning before commit | Custom bash hook only |
| No `SECURITY.md` | No vulnerability reporting policy | Missing file |
| GitHub Actions use floating tags | Supply chain attack surface | 27 instances of `@v4`, `@v3`, `@v2` |
| Crypto key is extractable | XSS could exfiltrate PAT encryption key | `crypto.ts:56` `extractable: true` |
| No security scanning in CI | Vulnerable deps + secrets reach production | Missing workflow |

### 2.2 Sync Architecture Risks

| Finding | Risk | Evidence |
|---------|------|----------|
| Silent remote overwrites | **Data loss** | `queue.ts` applies writes without conflict check |
| Dual cache divergence | Stale/conflicting data | SW caches API + IndexedDB has optimistic updates |
| No pre-write conflict check | Queue overwrites newer remote gists | `conflict-detector.ts` only called during bulk fetch |

### 2.3 Missing Documentation

| Finding | Impact | Evidence |
|---------|--------|----------|
| No `QUICKSTART.md` | Blocks new contributor onboarding | Missing file |
| No `CHANGELOG.md` | No version history at v0.1.0 | Missing file |
| No `SECURITY.md` | No vulnerability process | Missing file |
| No agent-specific docs | Only CLAUDE.md exists | Missing GEMINI.md, QWEN.md |

---

## 3. CI/CD & Scripts Analysis

### 3.1 Missing Files vs Upstream Template

#### P0 - Critical
- `.pre-commit-config.yaml` — Full pre-commit framework (gitleaks, shellcheck, markdownlint, trailing-whitespace, large-file checks)
- `.gitleaks.toml` — Secret scanning rules with allowlists
- `commitlint.config.cjs` — Conventional commit enforcement
- `.github/workflows/security-scan.yml` — Shellcheck (SARIF), Trivy, GitLeaks, CodeQL
- `.github/workflows/commitlint.yml` — Commit message validation in CI

#### P1 - Important
- `.actrc` + `scripts/run_act_local.sh` — Local GitHub Actions testing
- `scripts/lib/skill-validation.sh` — Robust skill validation library (150+ lines)
- `.yamllint.yml` — YAML/Actions workflow validation
- `markdownlint.toml` — Markdown linting config
- `.github/workflows/yaml-lint.yml` — actionlint + yamllint in CI
- `.github/workflows/dependabot-auto-merge.yml` — Automated non-major updates
- `.github/workflows/stale.yml` — Issue/PR hygiene
- `.github/labeler.yml` + `.github/workflows/labeler.yml` — PR auto-labeling

#### P2 - Nice to Have
- `.github/workflows/cleanup.yml` — Weekly unused-file detection
- `.github/workflows/version-propagation.yml` — Auto-propagate VERSION to markdown files
- `.github/ISSUE_TEMPLATE/config.yml` — Discussions links, blank issue control

### 3.2 Workflow Gaps

1. **No SHA-pinned action versions** — All workflows use floating tags (`@v4`, etc.)
2. **No timeout-minutes on all jobs** — Only `tests` has timeout
3. **No permissions blocks** — Missing least-privilege declarations
4. **No secret scanning in CI** — Critical for PAT-handling project
5. **No commit linting in CI** — AGENTS.md mandates conventional commits but no enforcement
6. **No YAML/shellcheck in CI** — 10 shell scripts unchecked
7. **Dependabot incomplete** — Missing `github-actions` ecosystem

### 3.3 Script Improvements

| Script | Current | Needed |
|--------|---------|--------|
| `validate-skills.sh` | 31 lines, basic existence check | 150+ line library with frontmatter validation, line count enforcement, version drift |
| `quality_gate.sh` | Type + lint + format + skills | Add shellcheck, markdownlint, yaml validation, secret scan pre-check |
| `pre-commit-hook.sh` | Custom bash, lint-staged | Replace with `pre-commit` framework |

---

## 4. Documentation Gap Analysis

### 4.1 README.md Gaps

- **No badges**: Version, License MIT, PRs Welcome, CI status
- **No "What Is This?" section**: Jumps straight to features
- **No prerequisites**: Node.js version, Git requirements
- **Inconsistent package manager**: README uses `pnpm`; AGENTS.md uses `npm`
- **Missing links**: QUICKSTART.md, CONTRIBUTING.md, SECURITY.md, CHANGELOG.md
- **No contributing/community section**
- **No "Built with AI agents" tagline**

### 4.2 AGENTS.md Gaps

- **No Single Source of Truth diagram** — CLAUDE.md/GEMINI.md/QWEN.md relationship unexplained
- **No Skills with Progressive Disclosure section** — Symlink architecture undocumented
- **No Sub-Agent Patterns** — Only 1 paragraph under "Agent Workflow"
- **No Context Discipline** — Context rot prevention missing
- **Skills table inline** — Should reference `agents-docs/AVAILABLE_SKILLS.md`

### 4.3 Missing Agent-Specific Files

| File | Purpose | Priority |
|------|---------|----------|
| `GEMINI.md` | Gemini CLI overrides | P1 |
| `QWEN.md` | Qwen Code overrides | P1 |
| `opencode.json` | OpenCode configuration | P2 |

### 4.4 Missing agents-docs/

| File | Purpose | Priority |
|------|---------|----------|
| `HARNESS.md` | Architecture and patterns | P1 |
| `SKILLS.md` | Creating reusable skills | P1 |
| `SUB-AGENTS.md` | Context isolation patterns | P1 |
| `HOOKS.md` | Pre/post tool hooks | P2 |
| `CONTEXT.md` | Back-pressure mechanisms | P2 |
| `CONFIG.md` | Repository constants reference | P2 |
| `MIGRATION.md` | Adopting patterns in existing code | P2 |
| `AVAILABLE_SKILLS.md` | Auto-generated skills list | P1 |

---

## 5. TRIZ Architecture Audit

### 5.1 Contradictions Discovered

| # | Contradiction | Severity | TRIZ Principle | Proposed Resolution |
|---|--------------|----------|----------------|---------------------|
| 1 | Offline-first vs Real-time sync | **Critical** | #23 Feedback | Pre-write conflict check in queue; store `expectedRemoteVersion` in `PendingWrite` |
| 2 | Mobile-first vs Desktop richness | Medium | #1 Segmentation | CSS Grid 3-pane on desktop; extract navigation shell |
| 3 | Performance budgets vs Features | High | #24 Intermediary | Fix route chunk budget to 50KB; lazy-load syntax highlighter |
| 4 | Security (encryption) vs Performance | High | #3 Local Quality | Session token cache (5min); encrypt master JWK with PBKDF2 |
| 5 | Bundle size vs Functionality | Medium | #2 Taking out | Build-time CSS generation; split critical/enhanced tokens |
| 6 | Type safety vs Velocity | Medium | #26 Copying | Schema codegen; discriminated union for `PendingWritePayload` |
| 7 | PWA offline vs Fresh data | **Critical** | #3 Local Quality | Remove API caching from SW; stale-while-revalidate in app layer |
| 8 | Capacitor vs Web purity | Low | #1 Segmentation | Platform abstraction layer; optional Capacitor deps |
| 9 | Token-driven vs Flexibility | Medium | #3 Local Quality | CSS Cascade Layers; runtime token override API |

### 5.2 Critical Actions

**Contradiction #1 (Offline-first vs Real-time sync)**:
- Add `preWriteConflictCheck` in `queue.ts` `executeWrite()`
- Store `expectedRemoteVersion` (remote `updated_at` at queue time) in `PendingWrite`
- Split queue into fast lane (star/unstar) and slow lane (CRUD with conflict checks)

**Contradiction #7 (PWA offline vs Fresh data)**:
- Remove GitHub API response caching from SW
- Implement stale-while-revalidate in `gist-store.ts` (IndexedDB first, background refresh)
- Add build timestamp to static cache name

---

## 6. Security & Compliance Audit

### 6.1 Code Security Issues

| Issue | Location | Fix |
|-------|----------|-----|
| `target="_blank"` without `rel="noopener noreferrer"` | `gist-detail.ts:105` | Add `rel` attribute |
| Inline `onclick` in offline page | `offline.html:141` | Replace with event listener + CSP |
| Crypto key extractable | `crypto.ts:56` | Set `extractable: false` |
| Token partial exposure | `logger.ts:13-18` | Return `'[REDACTED]'` unconditionally |
| 21 `innerHTML` assignments | Various components | Audit sanitization coverage |
| No SRI on Google Fonts | `index.html:13-15` | Add `integrity` attributes or self-host |

### 6.2 Missing Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera=(), microphone=(), geolocation=())

### 6.3 Compliance Checklist

#### Covered
- [x] CSP meta tag
- [x] Token encryption at rest (AES-GCM)
- [x] Token redaction in logs
- [x] Safe logging utilities
- [x] DOM sanitization (`esc()`, `sanitizeHtml()`)
- [x] Dependabot configured
- [x] HTTPS-only Capacitor
- [x] `.gitignore` excludes secrets
- [x] No hardcoded secrets

#### Missing
- [ ] `.gitleaks.toml`
- [ ] `.pre-commit-config.yaml`
- [ ] `SECURITY.md`
- [ ] SRI on external resources
- [ ] Security headers
- [ ] SHA-pinned GitHub Actions
- [ ] `npm audit` in CI
- [ ] Non-extractable crypto keys
- [ ] Unconditional token redaction
- [ ] `.yamllint.yml`
- [ ] Cache expiration in SW

---

## 7. Feature Completeness

### 7.1 Implemented v1 Features

- PAT auth with Web Crypto encryption
- IndexedDB gist CRUD with schema migrations
- Offline read/writes with sync queue + exponential backoff
- Conflict detection with 3 resolution strategies
- Export/import with JSON
- Typed GitHub REST client with deduplication + rate limiting
- Error taxonomy with recovery actions
- Responsive design (7 breakpoints, 3 nav modes)
- DTCG-aligned design token system
- Accessibility (skip links, ARIA, reduced motion, high contrast)
- Command palette + toast notifications
- PWA with SW caching + offline fallback
- Capacitor 6 Android packaging
- Global error boundaries
- Memory leak prevention (AbortController, lifecycle cleanup)
- Performance budgets (runtime + build-time)

### 7.2 Partially Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| ADR-010: SW cache name derivation | Deferred | Hardcoded cache names in `sw.js` |
| ADR-011: Vitest unit tests | Deferred | `tests/unit/` uses Playwright, not Vitest |
| Pre-commit workflow | Partial | `lint-staged` installed but hook wiring unconfirmed |
| Container queries | Partial | Only `gist-card` has `container-type` |
| Background sync | Missing | SW does not use Background Sync API |
| `tests/android/` | Missing | Script references non-existent directory |
| `auth-store.ts` / `ui-store.ts` | Missing | Architecture specifies but not implemented |
| `src/routes/` directory | Missing | Routing inline in `app.ts` |

### 7.3 Missing v1 Features

| Feature | Plan Reference |
|---------|---------------|
| Background Sync API | ADR-002 |
| `auth-store.ts` | `002-architecture.md` |
| `ui-store.ts` | `002-architecture.md` |
| `src/routes/` with lazy loading | `002-architecture.md` |
| `tests/android/` | `package.json` scripts |
| Web Crypto fallback | ADR-004 |
| PAT expiration UI | ADR-004 |

### 7.4 v2 Scope Creep Assessment

| Feature | v2 Marker | Status |
|---------|-----------|--------|
| View Transitions API | v2 animations | **Acceptable** — improves perceived performance |
| Conflict resolution UI | v2 conflict UI | **Acceptable** — needed for v1 sync |
| Skeleton loading | v2 skeleton | **Acceptable** — improves perceived performance |

**No dangerous v2 creep detected** (no OAuth, multi-account, backend sync, real-time collab).

---

## 8. Recommendations Roadmap

### Sprint 1: Security & Tooling (Week 1-2)

1. Add `.gitleaks.toml`, `.pre-commit-config.yaml`, `SECURITY.md`
2. Pin all GitHub Actions to SHA versions
3. Add `.github/workflows/security-scan.yml`
4. Add `.github/workflows/commitlint.yml`
5. Fix `extractable: true` in crypto.ts
6. Fix `target="_blank"` in gist-detail.ts
7. Add `npm audit` to CI

### Sprint 2: Documentation (Week 2-3)

8. Create `QUICKSTART.md`, `CHANGELOG.md`, `CHANGELOG-TEMPLATE.md`
9. Create `GEMINI.md`, `QWEN.md`
10. Rewrite `README.md` with badges, structure, consistency
11. Expand `CONTRIBUTING.md`
12. Create `agents-docs/HARNESS.md`, `SKILLS.md`, `SUB-AGENTS.md`
13. Extract `AVAILABLE_SKILLS.md` from AGENTS.md

### Sprint 3: Architecture Fixes (Week 3-4)

14. Add pre-write conflict check in sync queue (TRIZ #1)
15. Remove API caching from SW; implement app-layer stale-while-revalidate (TRIZ #7)
16. Add session token cache for crypto performance (TRIZ #4)
17. Fix performance budget plugin route chunk size to 50KB (TRIZ #3)
18. Build-time CSS generation for tokens (TRIZ #5)

### Sprint 4: Feature Completion (Week 4-5)

19. Implement ADR-010: Generate `sw.js` from template at build time
20. Implement ADR-011: Add Vitest, convert unit tests
21. Create `auth-store.ts`, `ui-store.ts`
22. Extract routes from `app.ts` to `src/routes/`
23. Add Background Sync API to SW

### Sprint 5: CI/CD & Automation (Week 5-6)

24. Add `.github/workflows/yaml-lint.yml`
25. Add `.github/workflows/dependabot-auto-merge.yml`
26. Add `.github/workflows/stale.yml`
27. Upgrade `validate-skills.sh` with library pattern
28. Add `.actrc` + `run_act_local.sh`
29. Add `.github/labeler.yml` + workflow

---

## 9. Stop Conditions & Risks

- **Docs contradict assumptions** → Stop → Document → Propose correction → Wait for confirmation
- **Security fixes may conflict with Capacitor WebView** → Test on Android before merging crypto changes
- **SW cache removal may affect offline page** → Verify offline.html still loads without API cache
- **Token cache introduces memory exposure** → Limit to 5 minutes, clear on visibility change

---

*Generated by swarm analysis. See individual agent outputs for detailed evidence and line references.*
