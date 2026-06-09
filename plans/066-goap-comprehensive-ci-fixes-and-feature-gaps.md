# 066 — GOAP: Comprehensive CI Fixes, Bug Triage & Feature Gap Closure

> **Status**: Active
> **Type**: GOAP
> **Created**: 2026-06-03
> **Updated**: 2026-06-03
> **Owner**: agent
> **Related**: CI workflows, src/stores/gist-store.ts, src/routes/create.ts, src/styles/base.css, plans/064-audit-2026-06-01-improvements-and-new-features.md, plans/063-pre-existing-ci-issues-2026-06-01.md

> **Prerequisites**: `plans/_status.json` entry 063 (F-Droid CI) is active

---

## Context

Multiple overlapping issues block CI and leave feature gaps unfilled:

1. **F-Droid build fails on every CI run** — `assembleFdroid` cannot resolve `:capacitor-android`, blocking ALL PR merges (5/5 runs fail).
2. **Release keystore double-path** — `ANDROID_KEYSTORE_PATH=app/keystore.jks` resolves to `android/app/app/keystore.jks`, blocking signed APK releases.
3. **Coverage 0.03% below threshold** — 83.97% vs 84% minimum.
4. **Mutation score 49.95% vs 70% threshold** — many tests don't detect mutations.
5. **Plan 064 audit** identified 7 bugs and 13 feature gaps, none yet addressed.
6. **ADR-016 lazy hydration** — `listGists()` returns full content instead of `?files=false`.

This plan is the single source of truth for resolving all three tiers: immediate CI blockers, quick-win fixes, and next-minor feature additions.

---

## Goals

### Goal 1: Fix F-Droid Build (Unblock All CI)

Restore `assembleFdroid` Gradle task so CI produces F-Droid APKs.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 1 | Investigate Gradle error: run `./gradlew assembleFdroid --stacktrace` locally and identify why `:capacitor-android` is unresolvable for the `fdroid` product flavor | Research done | Root cause identified | S |
| 2 | Check if `capacitor-android` module is included in `settings.gradle` for all product flavors, or if `fdroid` flavor excludes it via build type config | Action 1 done | Dependency graph understood | XS |
| 3 | Fix: ensure `capacitor-android` project is resolvable in `fdroidCompileClasspath` — likely need to add missing flavor/buildType dimension or fix `include` in `settings.gradle` | Action 2 done | F-Droid build resolves dependencies | M |
| 4 | Verify locally: `./gradlew assembleFdroid` completes without error | Action 3 done | Build produces APK | S |
| 5 | Verify CI: push to PR branch and confirm `Android F-Droid Build` step passes | Action 4 done | CI unblocked for all PRs | S |

### Goal 2: Fix Release Keystore Path

Fix double-nested keystore path so release builds produce signed APKs.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 6 | Read `android/app/build.gradle` to find where `ANDROID_KEYSTORE_PATH` is consumed and how the path is resolved | Research done | Understand path resolution | XS |
| 7 | Fix: either set `ANDROID_KEYSTORE_PATH=keystore.jks` (relative to `android/app/`) or change the Gradle config to use the correct absolute path | Action 6 done | Keystore found at correct path | XS |
| 8 | Verify: run release build locally or check CI release workflow output | Action 7 done | Signed APK produced | S |

### Goal 3: Coverage & Mutation Threshold Fixes

Bring coverage above 84% and mutation score above 70%.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 9 | Run `pnpm run test:coverage` and identify files with lowest line/branch coverage | Research done | Coverage gaps mapped | S |
| 10 | Add tests for 2-3 lowest-coverage files to push statement coverage from 83.97% to ≥84% | Action 9 done | Quality gate passes | S |
| 11 | Run mutation testing: `pnpm run test:mutation` and identify surviving mutants | Research done | Mutation gaps mapped | M |
| 12 | Add assertions to kill top 10 surviving mutants (focus on ambient light theming, error handling, form submission paths) | Action 11 done | Mutation score improved toward 70% | M |

### Goal 4: Quick-Win Bug Fixes (Plan 064 B3-B7)

Address low-effort bugs from the audit.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 13 | B3: Sync `package.json` version with `VERSION` file (currently `0.1.0` vs `0.2.0`) | Research done | Version consistency | XS |
| 14 | B4: Replace hardcoded `#f97316` in `src/styles/base.css:1078` with `var(--color-warning)` | Action 13 done | Token compliance | XS |
| 15 | B5: Add `test-results/` and `playwright-report/` to `.gitignore` | Action 13 done | No stale test artifacts in tree | XS |
| 16 | B6: Add header note to `adr-007-csp-and-logging-redaction.md` pointing to `adr-007-ui-ux-modernization.md` | Action 13 done | Naming clarity | XS |
| 17 | B7: Sync `_index.md` and `_status.json` — mark plan 060 as complete, add plan 064, update last-updated timestamps | Action 13 done | Registry consistency | XS |

### Goal 5: ADR-016 Lazy Content Hydration

Stop returning full file content in list endpoints.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 18 | Audit `src/services/github/client.ts` `listGists()` and `listStarredGists()` — confirm they pass `?files=false` or not | Research done | Gap confirmed | XS |
| 19 | Add `?files=false` query parameter to both list endpoints in `client.ts` | Action 18 done | List responses exclude file content | XS |
| 20 | Update `src/stores/gist-store.ts` to handle list responses without content (lazy-load on demand) | Action 19 done | Store handles partial payloads | S |
| 21 | Add unit tests verifying list calls include `?files=false` and detail calls include file content | Action 20 done | Regression prevention | S |

### Goal 6: PWA Install Prompt & Web APIs (Plan 064 F3, F5-F7, F13)

Ship low-effort user-facing features.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 22 | F3: Capture `beforeinstallprompt` event in `src/main.ts`, store deferred prompt, add install button in header/settings | Research done | Users can install PWA | S |
| 23 | F5: Call `navigator.storage.persist()` after first successful sync to prevent browser from evicting IndexedDB | Action 22 done | Data survives storage pressure | XS |
| 24 | F6: Call `navigator.setAppBadge(pendingCount)` when sync queue has pending items, clear with `setAppBadge(0)` when empty | Action 22 done | Visual pending sync indicator | XS |
| 25 | F7: Add `navigator.share({ title, text, url })` button on gist detail page | Action 22 done | Native share on mobile | XS |
| 26 | F13: Add "Open in GitHub" link (`gist.html_url`) and "Copy URL" button (`navigator.clipboard.writeText`) on gist detail | Action 22 done | Quick external access | XS |
| 27 | Add unit tests for install prompt capture, badge updates, and share/clipboard handlers | Action 26 done | Feature correctness | S |

### Goal 7: Multi-Select & Bulk Operations (Plan 064 F1)

Core productivity feature for managing multiple gists.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 28 | Add selection state to gist store: `selectedIds: Set<string>`, `toggleSelect(id)`, `selectAll()`, `clearSelection()` | Goal 5 done | Multi-select infrastructure | S |
| 29 | Add checkbox UI to each gist card in list view with shift-click range select | Action 28 done | Visual selection | S |
| 30 | Add bulk action toolbar (appears when selection non-empty): Star, Unstar, Delete, Copy URLs, Export | Action 29 done | Bulk operations UI | M |
| 31 | Implement bulk actions: batch API calls with `Promise.allSettled()`, progress indicator, error toast per failure | Action 30 done | Bulk operations functional | M |
| 32 | Add unit tests for selection state, toggle, range select, and each bulk action | Action 31 done | Regression prevention | S |

### Goal 8: Tags / Labels / Collections (Plan 064 F2)

Local tag system in IndexedDB for organizing gists.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 33 | Design tag schema: `{ id, name, color, gistIds: string[] }` in IndexedDB metadata store | Research done | Data model defined | S |
| 34 | Add tag CRUD to gist store: `createTag()`, `renameTag()`, `deleteTag()`, `assignTag(gistId, tagId)`, `removeTag(gistId, tagId)` | Action 33 done | Tag management functions | S |
| 35 | Add tag UI: tag chips on gist cards, tag filter in sidebar, "Manage Tags" in settings | Action 34 done | Tag visibility and filtering | M |
| 36 | Add tag assignment UI: multi-select dropdown on gist detail and in bulk actions toolbar | Action 35 done | Tag assignment workflow | S |
| 37 | Add unit tests for tag CRUD, assignment, filtering, and bulk tag operations | Action 36 done | Regression prevention | S |

### Goal 9: Syntax Highlighting (Plan 064 F4)

Display code with proper syntax highlighting.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 38 | Evaluate Shiki vs Prism — choose based on bundle size, language support, and WASM availability | Research done | Technology decision | S |
| 39 | Install chosen library and create `src/services/syntax-highlight.ts` wrapper | Action 38 done | Highlighting service | S |
| 40 | Apply highlighting to gist detail view and create form preview | Action 39 done | Code displayed with colors | S |
| 41 | Add line numbers as opt-in toggle | Action 40 done | Line reference support | XS |
| 42 | Add unit tests for highlight service and integration tests for gist detail rendering | Action 41 done | Regression prevention | S |

---

## Success Criteria

- [ ] F-Droid CI step passes on all runs
- [ ] Release builds produce signed APKs
- [ ] `pnpm run test:coverage` passes (≥84% statements)
- [ ] `pnpm run test:mutation` score ≥70%
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes (zero errors)
- [ ] `./scripts/quality_gate.sh` passes
- [ ] Plan 064 bugs B3-B7 resolved
- [ ] ADR-016 lazy hydration implemented
- [ ] PWA install prompt functional
- [ ] Multi-select + bulk operations functional
- [ ] Tags system functional
- [ ] Syntax highlighting functional

---

## Implementation Order

```
Phase 1 — Immediate (CI Unblock):
  Goal 1 (F-Droid) + Goal 2 (Keystore) + Goal 3 (Coverage/Mutation)
  Estimated: 2-3 days

Phase 2 — Quick Wins (Plan 064 bugs + Web APIs):
  Goal 4 (B3-B7) + Goal 5 (ADR-016) + Goal 6 (PWA + Web APIs)
  Estimated: 2-3 days

Phase 3 — Feature Additions:
  Goal 7 (Multi-select) + Goal 8 (Tags) + Goal 9 (Syntax Highlighting)
  Estimated: 2-3 weeks
```

---

## Agent Deployment Plan

| Phase | Agent Type | Tasks | Parallel? |
|-------|-----------|-------|-----------|
| Phase 1 | general | Goals 1-3 (bash required for Gradle, coverage) | Goals 1+2 parallel, Goal 3 sequential |
| Phase 2 | general | Goals 4-6 (bash for gitignore, lint) | All parallel |
| Phase 3 | general + explore | Goals 7-9 (explore for research, general for impl) | Research parallel, impl sequential |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| F-Droid build fix may require Capacitor config changes | Could break debug build | Test both `assembleDebug` and `assembleFdroid` after fix |
| Mutation score may require significant test rewrites | Time overrun | Focus on highest-impact mutations first; accept 60%+ as interim |
| Tags system may conflict with GitHub's native star/tag | UX confusion | Keep tags local-only, clearly distinguish from GitHub stars |
| Shiki WASM may increase bundle size | Performance regression | Set bundle budget check; lazy-load highlighter |
