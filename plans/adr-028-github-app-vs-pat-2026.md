<!-- Last Audit: 2026-05-16 -->
# ADR-028 — GitHub App vs Fine-Grained PAT (2026 re-evaluation)

**Status**: Accepted
**Date**: 2026-05-16
**Deciders**: Architect, Security Agent, GitHub API Agent
**Supersedes**: extends [ADR-004](adr-004-fine-grained-pat-v1.md); references [ADR-005](adr-005-no-backend-v1.md)
**Related**: [008-security.md](008-security.md), [adr-007-csp-and-logging-redaction.md](adr-007-csp-and-logging-redaction.md)

---

## Context

ADR-004 (2026 Q1) chose fine-grained PAT and explicitly rejected OAuth Device Flow and GitHub App as v1 options. Two years of practice exposed PAT friction:

- Users must manually create a token, scope it, copy/paste, and **rotate it every 90 days max** (GitHub fine-grained PAT cap).
- No UX for refresh / re-grant — token expiry surfaces as opaque 401s.
- Token is bearer-equivalent to the user's GitHub account session for the granted scope; if exfiltrated, the attacker has full gist read/write for the token's lifetime.
- Setup friction has been the **#1 onboarding drop-off** indicator from Web Vitals telemetry.

The 2026 question is: *should we adopt a GitHub App or OAuth Device Flow to reduce friction and increase security, while preserving the "no backend" promise of ADR-005?*

---

## Decision

**Keep fine-grained PAT as the default v1 onboarding path, AND add an opt-in OAuth Device Flow via a thin, stateless, optional CORS proxy** (a single-file Cloudflare Worker, ~80 LOC, open-source). Treat the proxy as **infrastructure plumbing**, not a backend: it stores no state, owns no secrets beyond the public Client ID, and is hot-swappable. ADR-005 is amended below.

Defer **full GitHub App installation tokens** to a v3 evaluation tied to multi-user / org features.

---

## Research Summary (May 2026)

### Option matrix

| Option | Backend? | Client secret? | CORS-safe? | Token lifetime | Refresh? | Onboarding friction |
| --- | --- | --- | --- | --- | --- | --- |
| **Fine-grained PAT (current)** | No | None | N/A — bearer header | up to 1 year, default 30 d | No | **High** — manual creation & rotation |
| **OAuth App, web flow** | **Yes** | Required at token exchange | ❌ no CORS on `/login/oauth/access_token` | 8 h user-to-server | Yes (refresh token) | Low (post-setup) |
| **OAuth App, Device Flow** | Thin proxy only | **Not required** | ❌ no CORS on `/login/device/code` | 8 h | Yes | Medium (8-digit code paste) |
| **GitHub App, user-to-server (web flow)** | **Yes** | Required | ❌ no CORS | 8 h | Yes (refresh) | Low |
| **GitHub App, user-to-server (Device Flow)** | Thin proxy only | Not required | ❌ no CORS | 8 h | Yes | Medium |
| **GitHub App, installation token** | Yes (JWT signer) | Private key | N/A | 1 h, app-managed | Auto | Server-only |

Sources (all checked 2026-05-16):

- GitHub Docs — *Authorizing OAuth apps* — confirms client_secret required for web flow; PKCE supported but `code → token` exchange has no CORS headers.
- GitHub Docs — *Best practices for creating a GitHub App* — *"If your app is a public client … you cannot secure your client secret"* and *"Don't enable device flow without reason"* (anti-phishing rationale).
- GitHub Community discussion #40077 — *Authenticating with a SPA without a relay* — confirmed by GitHub staff: no CORS preflight support on token endpoints; web flow is **impossible** from a pure SPA.
- zonca.dev — *Authenticate to GitHub in the Browser with the Device Flow* — documents working pattern using a thin Render.com proxy; same pattern is one-file on Cloudflare Workers (free tier covers ≥100k requests/day).
- GitHub REST API rate-limits doc — user-to-server tokens share the **same 5,000 req/h** budget as authenticated PATs for the same user, so no rate-limit gain from switching for a single-user app.

### Why GitHub App alone is not better today

1. **Same rate limit** as PAT (5k/h per user).
2. **Public-client warning**: shipping the app's client_secret in JS source defeats the security claim the app is supposed to provide.
3. **Device Flow** is allowed but GitHub itself warns against enabling it for phishing reasons; still the only no-secret path.
4. **Installation tokens** require a server with the private key — direct contradiction of ADR-005.
5. The **only** real Gist-API benefit of a GitHub App is fine-grained per-resource permissions, which fine-grained PATs already provide.

### Why a thin CORS proxy is acceptable

- **Stateless**: relays `POST /login/device/code` and `POST /login/oauth/access_token` only; no DB, no secret beyond the public OAuth App Client ID.
- **Hot-swappable**: any user can self-host the 80-line Worker; users without trust in the official proxy can point the app at their own URL via a setting.
- **No persistence**: the access token returned by GitHub is delivered straight to the SPA over HTTPS and stored encrypted in IndexedDB (existing ADR-004 mechanism).
- **No long-running compute**: Cloudflare Worker / Deno Deploy / Vercel Edge all fit free tiers; the deployment is `wrangler deploy` (no infrastructure team).

### Why we keep PAT as the primary path

- Zero infrastructure dependency for power users / forks.
- Maintains the ADR-005 promise literally for users who never opt in to OAuth.
- Backward-compatible — existing tokens keep working.

---

## Recommendation (the "should we switch" answer)

> **A GitHub App is not a strict improvement over a fine-grained PAT for this app's current scope** (single-user, gist-only, no backend). Adopt **OAuth Device Flow via a thin optional proxy** as an additive UX upgrade that lowers onboarding friction while preserving the no-backend story for those who care.

Concrete answer to the user's question: *check if a GitHub App is a better approach than a GitHub token* → **No, not on its own**. The token system itself isn't the problem; **manual rotation + setup friction** is. The fix is **Device Flow**, which works with either an OAuth App or a GitHub App. We choose **OAuth App + Device Flow** to keep scopes narrow (`gist` only) and avoid the "App publisher" identity overhead.

---

## Implementation Outline (tracked in plan 040)

1. Register a new GitHub OAuth App: name `d.o. Gist Hub`, scope `gist`, Device Flow **enabled**, web callback unused.
2. Ship a single-file Cloudflare Worker (`auth-proxy/worker.ts`) that proxies the two device-flow endpoints, sets `Access-Control-Allow-Origin: https://gist-hub.d-o.dev` (and the user's localhost during dev), and **rejects all other paths**.
3. Add `src/services/github/device-flow.ts`:
   - `requestDeviceCode()` → POST proxy `/device/code`.
   - `pollForToken(deviceCode, interval)` with exponential backoff and `slow_down` handling.
   - Returns same `{token, username}` shape as existing PAT save, so the rest of the app is unchanged.
4. Settings UI: add a second tab — *Sign in with GitHub* — that opens GitHub's `/login/device`, shows the user code, copies it to clipboard, and starts polling.
5. Token refresh: store `refresh_token`; refresh on 401 transparently, keep PAT users on the existing path.
6. CSP: add `https://auth-proxy.d-o.dev` (or user-configured) to `connect-src`.
7. Telemetry: count `auth.method = pat | device-flow` to validate the friction hypothesis.

---

## Amendment to ADR-005 (No Backend)

ADR-005's "no backend" promise is **clarified**: it means *no stateful server, no per-user data, no secrets at rest*. A **stateless, secret-less CORS relay** is permitted because it preserves all of these properties. Users who object may opt out by remaining on PAT — both paths stay supported.

---

## Tradeoffs

### Pros

- Drops onboarding friction from *"create token, copy, paste, save"* to *"click sign in, type 8-digit code"*.
- 8-hour user tokens limit blast radius vs. 90-day PATs.
- Refresh tokens enable silent re-auth; no more opaque 401s.
- Still scopable to `gist` only.
- Backward compatible — no break for existing PAT users.

### Cons

- Adds a (tiny) deploy surface: a Cloudflare Worker has uptime, monitoring, and DNS to manage.
- Introduces a deploy-time dependency for the **default** UX, even though PAT remains an escape hatch.
- GitHub's official advice discourages Device Flow for non-headless apps (phishing risk). We mitigate by:
  - Only ever opening the official `https://github.com/login/device` URL.
  - Showing the OAuth App's verified name + icon in the consent screen.
  - Documenting in-app: *"We will never ask you to enter the code anywhere other than github.com."*

---

## Rejected Alternatives

- **Embed client_secret in the SPA bundle** — explicitly warned against by GitHub Docs; trivially exfiltrated.
- **Full GitHub App installation tokens** — requires a server with the private key; violates ADR-005 substantively.
- **PKCE-only web flow** — GitHub does not support PKCE-without-secret today (community discussion #40077, confirmed 2026).
- **WebAuthn / passkey-only** — does not produce a GitHub API bearer token.

---

## Rollback Triggers

- GitHub adds CORS support to the OAuth token endpoint **and** PKCE-only flow (then we can drop the proxy entirely).
- The Worker proxy is abused at scale → revert to PAT-only and rate-limit at the Worker.
- GitHub deprecates Device Flow for OAuth Apps → fall back to PAT-only and pursue GitHub App + server.

---

## Success Metrics

- Onboarding completion rate (token saved → first gist loaded) ≥ 90% under Device Flow vs current PAT baseline.
- Median time-to-first-API-call < 60 s.
- 0 reports of phishing-style misuse in the first 90 days.
- Worker error rate < 0.5% of auth attempts.

*Created: 2026-05-16. Status: Accepted. Implementation tracked in [plan 040](#).*
