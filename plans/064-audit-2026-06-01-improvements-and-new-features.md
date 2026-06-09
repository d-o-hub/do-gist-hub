# 064 — Audit 2026-06-01: Improvements & New Feature Opportunities

> **Status**: Active
> **Type**: Analysis
> **Status**: Partially complete (reconciled 2026-06-09; implementation backlog remains)
> **Created**: 2026-06-01
> **Updated**: 2026-06-01
> **Owner**: agent
> **Related**: 047-v0.3.0-scope.md, 048-codebase-audit-implementation-gaps-ci-docs.md, 061-progress-update-2026-05-30-implementation-gaps.md, 063-pre-existing-ci-issues-2026-06-01.md, adr-016-github-api-efficiency.md


## Reconciliation Update — 2026-06-09

Static implementation checks show that several quick-win items from this audit have landed and should no longer be treated as wholly open:

| Item | Status | Evidence |
|------|--------|----------|
| B3 — version drift | Complete ✅ | `package.json` and `VERSION` both report `0.2.1`. |
| B4 — hardcoded warning color fallback | Complete ✅ | `src/styles/base.css` no longer contains `#f97316`; warning usages resolve through `var(--color-warning)`. |
| B5 — Playwright artifacts in git status | Complete ✅ | `.gitignore` contains `test-results/` and `playwright-report/`. |
| B6 — duplicate `adr-007-*` naming note | Complete ✅ | Both duplicate-number ADRs now contain reciprocal notes that preserve links without renaming history. |
| B7 — registry synchronization | Partially complete ◐ | This reconciliation updates `_index.md` and `_status.json`; future status changes still need to keep both files in lockstep. |
| F3 — PWA install prompt | Partially complete ◐ | `src/services/pwa/capabilities.ts` captures `beforeinstallprompt`; app-shell UI subscribes to the prompt state. Remaining telemetry polish is not verified here. |
| F5 — persistent storage | Complete ✅ | `src/services/pwa/capabilities.ts` requests persistent storage and records successful grants. |
| F6 — app badge for pending sync | Complete ✅ | `src/services/sync/queue.ts` imports `capabilities` and updates the badge after queue changes. |
| F7 — native share | Complete ✅ | `src/components/gist-detail.ts` implements a `Share` action with clipboard fallback. |
| F13 — external/copy URL actions | Complete ✅ | `src/components/gist-detail.ts` implements `Open in GitHub` and `Copy URL`. |

Plan 064 remains **partially complete** because large feature opportunities such as multi-select, tags/collections, and syntax highlighting are still backlog items.

---

## Context

Post-v0.2.0 stable, post-Plan-060 (paste/LLM/drag-drop), post-Plan-061 (implementation gaps audit), the repo is in a healthy state: **1044+ tests passing**, no TODOs/FIXMEs, dark-mode-first, 32 ADRs, all plan 048 / 050 / 060 actions complete, and a clean shell of modern web APIs (View Transitions, Speculation Rules, Popover, Container Queries, IndexedDB, AES-GCM).

This audit is a **forward-looking** inventory of (a) bugs and tech debt that remain, (b) features that are obvious gaps, and (c) modern web APIs not yet adopted. It is **not** a commitment to ship — it is a backlog organized by priority and effort, intended to inform the next GOAP cycle (v0.3.0 scope is already Complete per plan 047; this feeds the v0.4.0 plan).

## Methodology

1. Read every ADR and progress update in `plans/`.
2. Read `package.json`, `vite.config.ts`, `src/main.ts`, `src/services/db.ts`, `src/services/github/client.ts`, `src/components/app.ts`, `src/routes/home.ts`, `src/routes/settings.ts`, `src/routes/create.ts`, `src/sw/sw.ts`, `src/services/pwa/register-sw.ts`, `src/styles/base.css`, `tests/`, `agents-docs/issues/`.
3. `grep TODO|FIXME|XXX|HACK` in `src/` and `tests/` — **zero hits** (clean).
4. Cross-reference ADR-016 ("GitHub API efficiency") against actual `client.ts` implementation — found partial gap.
5. Cross-reference modern web API usage against MDN 2026 best practices.
6. Walk through user journeys (gisting, search, edit, share, backup) and note friction points.

---

## Findings — Bugs & Tech Debt

### B1. ADR-016 lazy hydration is **partially implemented** (P1, S–M)

**Status**: ADR-016 states `listGists` and `listStarredGists` should fetch metadata only and lazy-load file content on detail view. **In code**:
- `client.ts:165-176` strips file content client-side via `stripFileContent` (good — store only holds metadata).
- BUT the network call to `/gists` and `/gists/starred` does **not** pass `?per_page=...&page=...` with file truncation. Per GitHub API, `listGists` always returns full file content unless... actually, GitHub's `GET /gists` **does not** support `?files=false` for the list endpoint (it's only documented for `GET /gists/{id}` *sort of* — not reliably). So this ADR item is mostly satisfied by the client-side strip.
- However, the store **does not paginate** — `getAllGists()` reads the entire `gists` object store into memory, then strips. For a user with 1000+ gists, this is wasteful at sync time.

**Fix**: Implement cursor-based pagination in `listGists` (per_page=100, page=N until empty) and stream into IndexedDB. ADR-016 update: rename to "P1: pagination in addition to client-side strip."

**Effort**: S–M. **Impact**: High for power users.

### B2. F-Droid `assembleFdroid` Gradle task fails in CI (P0, M)

Per plan 063, the `Android F-Droid Build` CI job fails because the `assembleFdroid` Gradle task does not produce the expected APK at `android/app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk`. The buildType is correctly declared in `build.gradle` with `initWith release` and `matchingFallbacks ['release']`, but the actual Gradle build fails (full error not captured in plan 063 — needs re-run with `--stacktrace` per ADR-027).

**Fix**: Re-run with `--stacktrace`, capture the actual error, fix the Capacitor sync / build ordering root cause. Likely the same pattern as the debug variant fix referenced in plan 063.

**Effort**: M (debugging). **Impact**: High — unblocks F-Droid MR submission (plan 047 G1.3).

### B3. `package.json` version drift: `0.1.0` vs `VERSION: 0.2.0` (P3, XS)

**2026-06-09 status**: Complete ✅ — both `package.json` and `VERSION` now show `0.2.1`.

`package.json` field is stale. The `VERSION` file is canonical per `adr-001` and the release workflow, but `package.json` (used by `pnpm` metadata and IDE tooling) is not auto-synced.

**Fix**: Add a pre-release check in `.github/workflows/release.yml` to fail if `package.json` `version` != `VERSION` file content. Or add a `scripts/sync-version.js` that runs in `version-propagation.yml` (currently it only updates `README.md` and `CHANGELOG.md`).

**Effort**: XS. **Impact**: Low (cosmetic, but confusing for contributors).

### B4. `src/styles/base.css:1078` has a hardcoded color fallback `#f97316` (P3, XS)

**2026-06-09 status**: Complete ✅ — the literal fallback is absent from `src/styles/base.css`; warning colors use semantic tokens.

Tracked in `agents-docs/issues/css-hardcoded-colors.md` (Open, low severity). This single hit keeps the lint rule firing on every analyze pass.

**Fix**: Replace with `var(--color-warning)` or similar semantic token.

**Effort**: XS. **Impact**: Low (close the long-open issue).

### B5. `test-results/` and `playwright-report/` committed to tree (P3, XS)

**2026-06-09 status**: Complete ✅ — `.gitignore` includes both `test-results/` and `playwright-report/`.

The most recent commits show these as untracked or staged, but they appear in the working tree. Should be gitignored.

**Fix**: Add to `.gitignore`. Confirm with `git check-ignore`.

**Effort**: XS. **Impact**: Low (repo hygiene).

### B6. Two `adr-007-*` files — naming oddity (P3, XS)

**2026-06-09 status**: Complete ✅ — the duplicate-number ADRs contain reciprocal explanatory notes; no rename required.

`adr-007-csp-and-logging-redaction.md` and `adr-007-ui-ux-modernization.md` both have the `adr-007-` prefix. The second should be `adr-022-...` but the file is preserved for historical accuracy. Rename would break links in progress updates.

**Fix**: Add a header note in the second file pointing to `adr-022` as the canonical successor. **Do not rename** (breaks history).

**Effort**: XS. **Impact**: Low (clarity).

### B7. `_index.md` and `_status.json` slightly out of sync (P3, XS)

**2026-06-09 status**: Partially complete ◐ — this reconciliation updates both registries for plans 064, 066, and 067; the item remains a standing hygiene check for future plan changes.

`adr-022-2026-ui-trends-recommendations.md` appears in the ADR table but not the GOAP table; `063-pre-existing-ci-issues-2026-06-01.md` is missing from the active plans table.

**Fix**: Update both files to a consistent state as part of the next release prep.

**Effort**: XS. **Impact**: Low (agent discoverability).

---

## Findings — User-Facing Feature Gaps

### F1. Multi-select + bulk operations (P1, M)

The biggest UX gap. Currently, starring/un-starring/deleting/exporting requires one action per gist. For users with 200+ gists, this is a power-user blocker.

**Scope**:
- Checkbox UI on cards (long-press to enter selection mode on mobile).
- Floating action bar with: Star, Unstar, Delete, Tag, Export, Copy URL.
- Keyboard: `x` to toggle select, `Shift+Click` for range, `Cmd+A` to select all in current filter.
- Bulk operations are queued through the existing sync queue (offline-safe).
- Per-operation success/failure toast (e.g., "Starred 23/24 gists — 1 conflict").

**Effort**: M. **Impact**: High.

### F2. Tags / labels / collections (P1, M)

GitHub gists have no native tags. A local tag system would dramatically improve organization.

**Scope**:
- Tag CRUD in IndexedDB (new object store `tags` with `id`, `name`, `color`, `gistIds[]`).
- Tag chip UI on cards and detail view.
- Tag filter on home (multi-select chips).
- Tag autocomplete in command palette (Ctrl+K).
- Migration: import existing local `notes` if any (none today, so no migration needed).
- Sync: tags are local-only; export/import includes them.

**Effort**: M. **Impact**: High (organization is a top user need).

### F3. PWA install prompt (P1, XS)

**2026-06-09 status**: Partially complete ◐ — install prompt capture is implemented in `src/services/pwa/capabilities.ts` and surfaced through app-shell state; telemetry/dismissal UX details remain outside this static check.

`beforeinstallprompt` event is fired by Chromium-based browsers but the app does not handle it. The app is fully installable (manifest + SW + start_url) but users have to find the browser's install UI on their own.

**Scope**:
- Capture `beforeinstallprompt` in `src/services/pwa/register-sw.ts` and expose via a tiny store.
- Show an install CTA in the bottom sheet nav (mobile) and sidebar (desktop).
- Respect dismissal (localStorage gate with 7-day cooldown).
- Fire telemetry: `pwa.install.prompted`, `pwa.install.accepted`, `pwa.install.dismissed`.

**Effort**: XS. **Impact**: Medium (install conversion).

### F4. Syntax highlighting + line numbers in code view (P2, S)

File content is shown in plain `<pre><code>`. For a code-first app, this is a significant readability gap.

**Scope**:
- Use **Shiki** (or **Prism** if bundle size is a concern) for syntax highlighting, lazy-loaded per language.
- Languages required: TypeScript, JavaScript, Python, Go, Rust, HTML, CSS, JSON, Markdown, Shell, YAML (per GitHub gist language distribution).
- Line numbers: CSS counter or a `<ol>` wrapper.
- Theme-aware: dark and light variants from the design tokens.
- Copy button per file (already exists; verify).
- Performance: do not highlight on idle if file > 100KB (defer until scroll-into-view).

**Effort**: S. **Impact**: High (readability is core to the value prop).

### F5. `navigator.storage.persist()` request on init (P2, XS)

**2026-06-09 status**: Complete ✅ — `src/services/pwa/capabilities.ts` requests persistent storage and records successful grants.

Without persistent storage, the browser can evict IndexedDB under storage pressure. For an offline-first app, this is a regression risk.

**Scope**:
- Check `navigator.storage.persist()` after first IndexedDB write.
- If not persisted, show a one-time banner: "Allow persistent storage to keep your gists available offline."
- Handle denial gracefully.

**Effort**: XS. **Impact**: Medium.

### F6. `navigator.setAppBadge()` for pending sync count (P2, XS)

**2026-06-09 status**: Complete ✅ — `src/services/sync/queue.ts` calls `capabilities.setSyncBadge()` after queue changes.

PWA-installed users get a badge on their home screen icon. Showing the pending sync count is a high-utility, low-effort win.

**Scope**:
- After sync queue size change, call `navigator.setAppBadge(queue.length)` if supported.
- Clear on empty queue.
- Guard for unsupported browsers.

**Effort**: XS. **Impact**: Medium.

### F7. `navigator.share()` from gist detail (P2, XS)

**2026-06-09 status**: Complete ✅ — `src/components/gist-detail.ts` includes a `Share` action using Web Share with clipboard fallback.

Mobile share-sheet integration. Currently, sharing requires copying the URL manually.

**Scope**:
- "Share" button on gist detail (mobile only; desktop uses "Copy URL").
- Share `title` = gist description, `text` = first 200 chars of content, `url` = gist HTML URL.
- Graceful fallback to copy-to-clipboard on desktop or unsupported browsers.

**Effort**: XS. **Impact**: Medium.

### F8. Keyboard shortcuts expansion (P2, S)

Currently only `Ctrl+K` is global. Power users want:
- `/` to focus search
- `n` to new gist (on home)
- `j/k` to navigate cards
- `?` to show keyboard help
- `g h` / `g s` / `g t` for home/starred/tags
- `Esc` to deselect/close

**Scope**:
- Centralized keyboard manager in `src/utils/keyboard.ts` (new file).
- Shortcut help modal triggered by `?`.
- Avoid conflicts with form inputs (use `contenteditable` check or `isInputFocused()` guard).

**Effort**: S. **Impact**: Medium (power user UX).

### F9. Per-gist export / zip bundle (P2, S)

Export-all is implemented. Per-gist export and zip bundles are not.

**Scope**:
- Single-gist export: download as JSON or as a zip with files at root.
- Multi-gist export (related to F1): zip with per-gist folders.
- Use a tiny `JSZip`-free implementation (the spec is small enough to hand-roll, or use a 5KB dep).

**Effort**: S. **Impact**: Medium.

### F10. In-app log viewer (P2, S)

Logs are stored in IndexedDB (`logs` store, 1000-entry ring buffer) but there is no UI to view them. Useful for debugging sync issues.

**Scope**:
- New route `/diagnostics/logs` (or expand the existing `/settings` Diagnostics section).
- Virtualized list (1044 entries is too many for naive rendering).
- Filter by level (error, warn, info) and category.
- "Copy all" and "Clear logs" actions.
- Respect the 1000-entry cap (oldest auto-truncated).

**Effort**: S. **Impact**: Medium (debuggability).

### F11. `?files=false` (or equivalent) on list endpoints (P2, S)

GitHub's `GET /gists` returns full file content in the list endpoint, which is wasteful. Although the client strips content client-side (B1), the bandwidth is still consumed. The Gist API does not support a `files` query param, but we can:
- Request `per_page=30` (default) to bound the response.
- Use ETags aggressively (already done).
- Consider using the GraphQL API for metadata-only fetch (requires PAT with GraphQL scope, adds complexity — defer).

**Effort**: S (just set per_page explicitly). **Impact**: Low–Medium.

### F12. Per-gist sync status filter (P2, XS)

Sync queue is global; users cannot see "which gists have pending writes."

**Scope**:
- New filter chip: "Pending sync."
- Read from `pendingWrites` store.
- Hide on filter change.

**Effort**: XS. **Impact**: Low (niche but cheap).

### F13. "Open in GitHub" / "Copy URL" buttons on gist detail (P2, XS)

**2026-06-09 status**: Complete ✅ — `src/components/gist-detail.ts` renders `Open in GitHub` and `Copy URL` actions.

`htmlUrl` is in the store but not surfaced.

**Scope**:
- Two small buttons in the detail header.
- Copy URL: `navigator.clipboard.writeText(htmlUrl)` with toast confirmation.
- Open in GitHub: `_blank` with `rel="noopener noreferrer"`.

**Effort**: XS. **Impact**: Low (discoverability).

---

## Findings — Modern Web API Opportunities (P3 unless noted)

| API | Why | Effort | Notes |
|---|---|---|---|
| **Web Share API** | Mobile share-sheet | XS | See F7 |
| **Badging API** | PWA icon sync count | XS | See F6 |
| **Storage API (`persist()`)** | Prevent eviction | XS | See F5 |
| **CompressionStream** | Compress LLM prompt bodies | S | For very large pastes; deferred |
| **File System Access API** | Edit files in place | L | Out of scope; overkill |
| **EyeDropper API** | Pick a custom accent color | S | For theme settings; nice-to-have |
| **EditContext API** | Rich text editor for gists | L | Out of scope; would replace `<textarea>` |
| **ReadableStream** for LLM | Stream AI PARSE results | S | Plan 060 ships full response only; streaming is a UX win for large pastes |
| **Navigation API** | Replace `popstate` + `pushState` boilerplate | S | Modern, type-safe routing |
| **Document Picture-in-Picture** | Floating code viewer | M | Niche; not requested |

---

## Findings — Out of Scope (Confirmed)

These were already triaged and remain out of scope for the near term (per plan 047):
- Multi-account support (architectural change; auth store is single-user)
- Real-time collaboration (requires backend; ADR-005)
- iOS packaging (no device access)
- Real Android hardware E2E (no physical device)
- Field-level merge (local-wins/remote-wins/manual is sufficient)
- GitHub App installation tokens (deferred to v3+; ADR-028)

---

## Recommended Next Steps

### Immediate (next sprint, fits in v0.3.0 patch release)
1. **B2**: Fix F-Droid `assembleFdroid` — unblocks F-Droid MR.
2. **B3**: Sync `package.json` version — quick fix in `version-propagation.yml`.
3. **B4**: Replace hardcoded color in `base.css:1078`.
4. **B5**: Gitignore `test-results/`, `playwright-report/`.
5. **F3**: PWA install prompt.
6. **F5**: `navigator.storage.persist()`.
7. **F6**: `setAppBadge()` for pending sync.
8. **F7**: `navigator.share()` on gist detail.
9. **F13**: "Open in GitHub" / "Copy URL" buttons.

**Total effort**: ~2 days. **Total impact**: closes the most visible PWA-2026 gaps.

### Next minor release (v0.3.x)
1. **B1**: Cursor pagination in `listGists`.
2. **F1**: Multi-select + bulk operations.
3. **F2**: Tags / labels / collections.
4. **F4**: Syntax highlighting.
5. **F8**: Keyboard shortcuts expansion.
6. **F10**: In-app log viewer.

**Total effort**: ~3 weeks. **Total impact**: power-user feature parity with desktop gist managers.

### v0.4.0 candidate
- **F9**: Per-gist export / zip bundle (depends on F1 multi-select).
- **F11**: Per-page bounding on list endpoints.
- **F12**: Per-gist sync status filter.
- **Navigation API** migration.
- **ReadableStream** for LLM responses.

---

## Open Questions for User

1. **F1 + F2 priority**: Is multi-select or tags more important to your use case? Both are M-effort.
2. **F4 syntax highlighter choice**: Shiki (heavier, GitHub-quality) vs Prism (lighter, less accurate)? Bundle size matters for PWA startup.
3. **F-Droid**: Are you ready to submit the MR after B2 is fixed? External repo dependency.
4. **v0.3.0 patch**: Are the "Immediate" items appropriate for a patch release, or should they wait for v0.4.0?
5. **Multi-account**: Is the deferred v0.4.0+ item still on the table, or should it be re-evaluated for v0.3.x?
