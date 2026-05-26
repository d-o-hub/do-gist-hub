# ADR-030: GitHub Pages Deployment

> **Date**: 2026-05-20
> **Status**: Complete
> **Related**: `cd.yml`, `vite.config.ts`, `auth-proxy/worker.ts`, `adr-005-no-backend-v1.md`

---

## Context

The project has a fully written CD workflow (`.github/workflows/cd.yml`) that deploys the web app to GitHub Pages using `actions/deploy-pages`. It:

- Triggers on successful CI run against `main` (or manual dispatch)
- Uses `actions/configure-pages`, `upload-pages-artifact`, and `deploy-pages`
- Has a `check-pages` guard that gracefully skips if Pages isn't enabled
- Sets `pages: write` and `id-token: write` permissions

However, GitHub Pages was never enabled in the repository settings. When manually activated and deployed, the site at `https://d-o-hub.github.io/do-gist-hub/` only renders the static HTML ("Skip to main content") — the JS bundle fails to load.

### Research findings

The app is **fully compatible** with GitHub Pages as a static hosting platform:

| Requirement | Compatible? | Notes |
|-------------|------------|-------|
| Static HTML/CSS/JS serving | Yes | Core GH Pages feature |
| SPA without URL routing | Yes | App uses in-memory event-based routing (`app:navigate`), not URL path routing — no `404.html` fallback needed |
| IndexedDB (offline storage) | Yes | Browser API, no server |
| Service Worker (PWA) | Yes | Registered from client JS |
| GitHub REST API calls | Yes | `api.github.com` allows CORS from any origin |
| OAuth Device Flow | Yes | Auth proxy is a standalone Cloudflare Worker at `auth-proxy.d-o-gist-hub.workers.dev` — independent of hosting platform |
| CSP via `<meta>` tags | Yes | Already in `index.html` — works on GH Pages (no HTTP headers needed) |

### Gap analysis

Three issues must be resolved before the site works:

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| **G1** | **Vite `base` path** defaults to `/` but GH Pages serves at subpath `/do-gist-hub/` | `vite.config.ts` | All JS/CSS asset 404s — blank app |
| **G2** | **Auth proxy CORS** `ALLOWED_ORIGINS` list doesn't include `https://d-o-hub.github.io` | `auth-proxy/worker.ts:15-18` | OAuth device flow will fail CORS preflight |
| **G3** | **Manifest + SW paths** hardcoded to `/` — scope, start_url, SW registration, precache assets | `vite.config.ts`, `register-sw.ts`, `sw.ts` | SW won't control correct scope; precache misses assets |

---

## Decision

**Adopt GitHub Pages as the primary web deployment target.**

Rationale:
1. ADR-005 (no backend) already commits to serverless architecture — GH Pages is consistent with this
2. CD workflow is already written and maintained — only needs activation
3. No additional hosting cost (free for public repos)
4. Tight GitHub integration — deployment status appears in PR checks automatically
5. Custom domain can be added later without architectural changes

### Implementation approach

Use Vite's `base` config + `import.meta.env.BASE_URL` for dynamic path derivation so that:
- All built asset paths are correct for the subpath
- The service worker registration and precache use the same base
- If a custom domain is added later (eliminating the subpath), only `base` needs to change

---

## Recommended Actions

| # | Action | File(s) | Priority |
|---|--------|---------|----------|
| A1 | Set `base: '/do-gist-hub/'` in Vite config | `vite.config.ts` | P0 |
| A2 | Add `https://d-o-hub.github.io` to `ALLOWED_ORIGINS` | `auth-proxy/worker.ts` | P0 |
| A3 | Update manifest plugin `scope` and `start_url` to use base path | `vite.config.ts` | P0 |
| A4 | Update SW registration URL and scope to use base path | `src/services/pwa/register-sw.ts` | P0 |
| A5 | Update `PRECACHE_ASSETS` in SW to use base-prefixed paths | `src/sw/sw.ts` | P0 |
| A6 | Update SW CSP report-uri and offline fallback paths | `src/sw/sw.ts` | P1 |
| A7 | Update `index.html` speculation rules `href_matches` | `index.html` | P1 |
| A8 | Enable GitHub Pages in repo settings (Source: GitHub Actions) | Repo settings | P0 |

### Non-ADR changes (ADR-005 already covers no-backend)

This ADR does not supersede ADR-005. GitHub Pages is a deployment target, not a backend — no server-side code runs.

---

## Consequences

### Positive
- Zero-cost static hosting for the web app
- Automatic deployment from CI on every `main` push
- CD workflow already exists and is maintained
- Enables the PWA (service worker works on GH Pages)
- PR previews via `actions/deploy-pages` (on-demand preview environments)

### Negative
- Subpath URL (`/do-gist-hub/`) — slightly less clean but opaque to users after navigation
- No server-side CSP headers (mitigated by existing `<meta>` CSP tags)
- 1GB storage limit, 100GB/month bandwidth (well within expected usage for a Gist manager)
- Rate-limited to 10 builds/hour (sufficient for `main`-only deploys)

### Mitigations
- Custom domain can be added later for cleaner URLs
- Add `_headers` or `_redirects` file if GitHub Pages adds support for custom headers (currently not available for org/user sites)

---

## Verification

```bash
# Build locally with base path
pnpm run build

# Verify assets reference correct paths
grep -c '/do-gist-hub/assets/' dist/index.html  # should be > 0
grep -c 'src="/assets/' dist/index.html          # should be 0

# Preview locally
pnpm run preview
```

Once deployed, visit `https://d-o-hub.github.io/do-gist-hub/` and confirm:
1. App loads fully (not just "Skip to main content")
2. OAuth Device Flow works (CORS from `github.io` origin)
3. Service Worker registers correctly
4. Offline mode works (cached assets served from SW)
