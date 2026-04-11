# AGENTS.md

> Single source of truth for all AI coding agents in this GitHub Gist CRUD app repository.
> Built with: Vite, TypeScript, PWA, Capacitor Android, IndexedDB, GitHub REST API
> Design System: Token-driven, mobile-first, responsive from 320px to 1536px+

## Mission

Build a production-ready, web-first GitHub Gist CRUD app with:
- Offline-first behavior using IndexedDB as v1 local source of truth
- Fine-grained GitHub PAT authentication (no OAuth/device flow for v1)
- Full gist CRUD and related actions (star/unstar/fork/revisions)
- Token-driven design system derived from `do-gemini-ui-ux-skill`
- Full responsive support from small phones to large desktop screens
- Complete global error handling with user-safe messages
- Security hardening with CSP, token redaction, input validation
- Memory-leak prevention via AbortController and lifecycle cleanup
- Performance budgets with Web Vitals measurement
- Android packaging via Capacitor

## Source-of-Truth Rules

1. **Repository files** take precedence over all other sources
2. **AGENTS.md** is the single source of truth for agent instructions
3. **`.agents/skills/`** contains canonical skill definitions
4. **`plans/` and ADRs** document architecture decisions
5. **Official documentation** over blogs or community sources
6. **`do-gemini-ui-ux-skill`** token system as visual baseline (upgraded for production)

## Stack and Rationale

| Layer | Technology | Rationale |
|-------|------------|-----------|
| App Shell | Vite + TypeScript | Fast HMR, tree-shaking, modern tooling |
| UI Framework | Vanilla TS + Token-driven CSS | No framework overhead, full token control |
| Design System | Semantic tokens (DTCG-aligned) | Portable, themeable, future-proof |
| Local Storage | IndexedDB | Offline-first, large payload support |
| HTTP Client | Native Fetch + AbortController | No dependency bloat, cancelable requests |
| Auth | Fine-grained GitHub PAT | Simple v1 auth, least-privilege tokens |
| PWA | Service Worker + Manifest | Installable, offline-capable |
| Android | Capacitor | WebView wrapper, native packaging |
| Testing | Playwright | Cross-browser, mobile emulation, Android API |
| Quality | ESLint + Prettier + shellcheck | Code consistency |

## Template Repo Usage Rule

Use `github-template-ai-agents` structure for:
- `AGENTS.md` format and conventions
- `.agents/skills/` organization
- Skills discovery and execution patterns
- Quality gate scripts
- Conventional commit workflow
- Pre-commit hooks

Do not copy unnecessary CI/CD or harness complexity.

## Token Design Reuse Rule

Reuse and upgrade the token design from `do-gemini-ui-ux-skill`:
- Preserve semantic token architecture
- Upgrade to DTCG-style naming and portability
- Add responsive scaling (7 breakpoints)
- Add motion, elevation, layout tokens
- Support dark/light themes
- Document token contracts clearly

Do not copy blindly. Productionize for:
- Accessibility (WCAG AA contrast)
- Performance (CSS containment where useful)
- Maintainability (clear naming, no ambiguity)

## Latest-Doc Verification Rule

Before implementing any tool-, API-, platform-, or browser-dependent behavior:
1. Search latest official docs
2. Prefer official docs over blogs
3. Record doc links in relevant plan/ADR/README
4. Stop and revise if implementation conflicts with official docs

Applies to: Vite, PWA, Capacitor, IndexedDB, GitHub REST, PAT permissions, Playwright, CSP, performance measurement, memory-leak prevention, AbortController, design tokens.

## Setup Commands

```bash
# Install dependencies
npm install

# Create skill symlinks
./scripts/setup-skills.sh

# Install git pre-commit hook
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

# Initialize design system
npm run init:design

# Start dev server
npm run dev
```

## Dev Commands

```bash
# Development server with HMR
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Generate coverage
npm run test:coverage
```

## Test Commands

```bash
# All tests
npm run test

# Browser tests only
npm run test:browser

# Mobile emulation tests
npm run test:mobile

# Offline tests
npm run test:offline

# Android/WebView smoke
npm run test:android

# Visual regression
npm run test:visual

# Accessibility smoke
npm run test:a11y
```

## Build Commands

```bash
# Production build (web)
npm run build

# Production build (Android)
npm run build:android

# Sync Capacitor
npm run cap:sync

# Open Android project in Android Studio
npm run cap:android:open
```

## Android Packaging Commands

```bash
# Install Capacitor dependencies
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize Capacitor
npx cap init

# Add Android platform
npx cap add android

# Sync web assets to Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Build APK (in Android Studio)
# File > Build Bundle(s) / APK(s) > Build APK(s)
```

## Code Style and Naming Rules

- **Max lines per source file**: 500
- **Max lines per SKILL.md**: 250
- **Max lines AGENTS.md**: 150 (this file may exceed for completeness)
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `ci:`, `test:`, `refactor:`, `chore:`
- **TypeScript**: Strict mode, no `any`, explicit return types on public APIs
- **Naming**: camelCase for variables/functions, PascalCase for types/components, UPPER_SNAKE_CASE for constants
- **Files**: kebab-case for filenames, e.g., `design-system.ts`, `error-boundary.ts`
- **Imports**: Absolute paths from `src/`, group imports (stdlib, external, internal)
- **Shell scripts**: `shellcheck` compliant, use `set -euo pipefail`

## Token Architecture Rules

1. **Tokens First**: All styles must derive from semantic tokens
2. **No Hardcoded Values**: No magic numbers in components when a token should exist
3. **Layered Architecture**:
   - Primitive tokens (raw values)
   - Semantic tokens (meaningful names)
   - Component tokens (specific use cases)
4. **Themeable**: Support dark/light modes via token variants
5. **Responsive**: Tokens scale across 7 breakpoints
6. **Serializable**: Tokens exportable as JSON for tooling
7. **Documented**: Each token has clear purpose and usage examples
8. **Stable Naming**: No ambiguous names like `color1`, `size2`
9. **DTCG Alignment**: Follow Design Tokens Community Group direction for portability

## Responsive Design Rules

1. **Mobile-First**: Design for 320px first, scale up
2. **7 Breakpoints**:
   - `--bp-phone-small`: 320px
   - `--bp-phone`: 390px
   - `--bp-phone-large`: 480px
   - `--bp-tablet-portrait`: 768px
   - `--bp-tablet-landscape`: 1024px
   - `--bp-desktop`: 1280px
   - `--bp-desktop-wide`: 1536px
3. **Fluid Typography**: Use `clamp()` for smooth scaling
4. **Touch Targets**: Minimum 44x44px on mobile
5. **Safe Areas**: Respect `env(safe-area-inset-*)` for notched devices
6. **No Horizontal Scroll**: Content fits viewport width
7. **Density Shifts**: Adjust spacing and font sizes per breakpoint

## Global Error Handling Rules

1. **Structured Errors**: Every async path returns structured errors
2. **User-Safe Messages**: Human-readable messages, no raw stack traces
3. **Recoverable Actions**: Offer next steps for recoverable errors
4. **Fatal Fallback**: Safe global fallback for fatal errors
5. **Redacted Diagnostics**: No secrets in logs or diagnostics
6. **No Silent Failures**: Every promise rejection handled
7. **No Infinite Retries**: Bounded retry policies with backoff
8. **Offline Transitions**: Clear UI state for offline/online transitions
9. **Error Taxonomy**: Classify errors by type and handling strategy

## Security Rules

1. **Never Log PAT**: Redact all authorization data
2. **Never Expose PAT in UI**: Mask after save, provide wipe flow
3. **Never Place PAT in URLs**: Use Authorization header only
4. **CSP Configuration**: Strict Content-Security-Policy headers
5. **Input Validation**: Sanitize all user-provided fields
6. **HTTPS Only**: All remote endpoints use HTTPS
7. **Safe Raw Rendering**: Careful with raw gist content (XSS risk)
8. **External Links**: Safely open GitHub links with `rel="noopener noreferrer"`
9. **No HTML Injection**: Escape description and file views unless explicitly trusted
10. **Least Privilege PAT**: Document minimum required scopes

## Memory Leak Prevention Rules

1. **Cleanup Mandatory**: All timers, listeners, observers must be cleaned up
2. **AbortController Required**: Cancelable fetch for all async requests
3. **Route Cleanup**: Clear route-scoped resources on navigation
4. **No Retained Bodies**: Avoid keeping large gist file bodies in dead views
5. **Blob URL Revocation**: Revoke object URLs when no longer needed
6. **Single Cache**: Avoid duplicate caches for same content
7. **Bounded Listeners**: No unbounded event listener accumulation
8. **Editor Cleanup**: Clear syntax highlighter and editor model instances
9. **Service Worker Messaging**: Bounded and cleaned up message channels

## Performance Budget Rules

1. **Initial JS Budget**: < 150KB gzipped
2. **Route Chunk Budget**: < 50KB gzipped per route
3. **Font Budget**: < 100KB total, subset fonts
4. **Image/Icon Budget**: < 200KB total, use SVG where possible
5. **Cold Start Target**: < 2s on mid-tier mobile
6. **Interaction Target**: < 100ms for gist list interactions
7. **Search Latency**: < 200ms for local search
8. **Editor Open**: < 300ms from tap to ready
9. **Web Vitals Measurement**: Track LCP, FID, CLS, INP
10. **Code Splitting**: Lazy-load heavy features (editor, revisions)

## Offline-First Rules

1. **IndexedDB Source of Truth**: Local DB is primary read source
2. **Optimistic Writes**: Update UI immediately, sync in background
3. **Pending Queue**: Queue writes when offline
4. **Retry Policy**: Exponential backoff for failed syncs
5. **Conflict State**: Track and surface sync conflicts
6. **Stale Indicators**: Show last-synced timestamps
7. **Cache Strategy**: Cache shell aggressively, API data strategically
8. **Migration Support**: Schema migrations with rollback

## GitHub API Rules

1. **Typed Client**: All requests typed, validated responses
2. **Pagination**: Handle `Link` headers for paginated results
3. **Rate Limits**: Track `X-RateLimit-*` headers, back off when near limit
4. **Conditional Requests**: Use `If-None-Match` for caching
5. **API Version**: Set `Accept: application/vnd.github+json; version=2022-11-28`
6. **Auth Header**: `Authorization: Bearer <PAT>`
7. **Error Mapping**: Map HTTP status codes to app error taxonomy
8. **Endpoint Coverage**: Implement all gist endpoints from official docs

## Scope Rules v1 vs v2

### v1 (This Project)
- Fine-grained PAT authentication
- IndexedDB local storage
- Web-first PWA
- Capacitor Android packaging
- Full gist CRUD
- Star/unstar/fork/revisions
- Offline read, queued writes
- Basic conflict surfacing

### v2 (Future, Not Now)
- OAuth device flow
- Backend sync server
- Real-time collaboration
- Advanced conflict resolution
- Multi-account support
- Turso/edge database
- Push notifications

Do not implement v2 features in v1. Keep scope tight.

## Skills Discovery and Usage Rules

1. **List Skills**: `ls .agents/skills/` to see available skills
2. **Run Skill**: Reference skill by name in agent prompt
3. **Skill Structure**: Each skill has `SKILL.md` with frontmatter
4. **Progressive Disclosure**: Load skills on demand, not all at once
5. **Sub-Agent Pattern**: Delegate isolated tasks to sub-agents
6. **Post-Task Learning**: Capture non-obvious insights in nearest `AGENTS.md`

## Plans/ADR Workflow

1. **Create Plan**: Use `plan-adr-goap` skill to generate plans
2. **Write ADR**: Document significant decisions in `plans/adr-*.md`
3. **Review**: Reviewer agent verifies ADR completeness
4. **Implement**: Follow ADR decision during implementation
5. **Update**: Revise ADR if decision changes

## Validation-Before-Commit Rule

Before committing:
1. Run `./scripts/quality_gate.sh`
2. Verify type check passes
3. Verify tests pass
4. Verify lint passes
5. Verify no console errors in dev tools
6. Verify responsive behavior on 2+ viewports
7. Verify no network tab errors
8. Verify memory profile stable (no obvious leaks)

## Conventional Commit Rule

Format: `<type>(<scope>): <subject>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation change
- `style`: Code style (formatting, semicolons)
- `refactor`: Code refactor (no feature change)
- `test`: Test addition or update
- `chore`: Build process, tooling, deps

Examples:
```
feat(gist-list): add infinite scroll pagination
fix(auth): handle expired PAT gracefully
docs(readme): update setup instructions
refactor(tokens): normalize semantic token naming
test(playwright): add offline read test
chore(deps): bump vite to 5.x
```

## Stop Conditions When Docs Contradict Assumptions

Stop immediately and:
1. Document the contradiction in relevant plan/ADR
2. Propose corrected approach based on official docs
3. Wait for confirmation before proceeding
4. Update any misleading documentation

Never guess. Never assume. Verify against official docs.

## Reference Docs

### Repo and Agent Workflow
- https://github.com/d-o-hub/github-template-ai-agents
- https://agents.md/
- https://developers.openai.com/codex/guides/agents-md
- https://agentskills.io/home
- https://agentskills.io/specification
- https://agentskills.io/skill-creation/quickstart

### Design Token Reference
- https://github.com/d-oit/do-gemini-ui-ux-skill
- https://www.designtokens.org/
- https://www.w3.org/community/design-tokens/
- https://github.com/design-tokens/community-group

### PWA and Web Platform
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Best_practices
- https://web.dev/
- https://web.dev/articles/vitals
- https://web.dev/explore/learn-core-web-vitals
- https://web.dev/articles/vitals-measurement-getting-started
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- https://developer.android.com/topic/architecture/data-layer/offline-first
- https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy

### Security
- https://cheatsheetseries.owasp.org/
- https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- https://owasp.org/www-project-top-ten/

### GitHub API
- https://docs.github.com/en/rest
- https://docs.github.com/en/rest/gists/gists
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api
- https://docs.github.com/rest/using-the-rest-api/using-pagination-in-the-rest-api
- https://docs.github.com/rest/using-the-rest-api/best-practices-for-using-the-rest-api

### Android and Testing
- https://capacitorjs.com/docs/
- https://capacitorjs.com/docs/android
- https://capacitorjs.com/docs/web/progressive-web-apps
- https://playwright.dev/docs/emulation
- https://playwright.dev/docs/api/class-android
- https://playwright.dev/docs/api/class-androidwebview

## Available Skills

See `.agents/skills/` directory for all available skills. Run `ls .agents/skills/` to list.

Key skills for this project:
- `repo-bootstrap` - Initialize repo structure
- `agents-md-author` - Create/update AGENTS.md
- `plan-adr-goap` - Generate plans and ADRs
- `design-token-system` - Productionize token architecture
- `responsive-system` - Define responsive behavior
- `ui-ux-optimize` - Optimize UI/UX with tokens
- `global-error-handling` - Error handling strategy
- `security-hardening` - Security implementation
- `performance-budgeting` - Performance measurement
- `memory-leak-prevention` - Leak prevention patterns
- `offline-indexeddb` - IndexedDB schema and operations
- `github-gist-api` - GitHub API client
- `pwa-shell` - PWA setup
- `capacitor-android` - Android packaging
- `playwright-quality` - Test coverage
- `reviewer-evaluator` - Quality gates

---

*Last updated: 2026. Keep this file current as the project evolves.*
