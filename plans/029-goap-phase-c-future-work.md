# GOAP Plan — Phase C: Future Work, Strictness & Production Polish

> **Status**: Complete ✅ (All actions implemented + verified)  
> **Created**: 2026-07-18  
> **Updated**: 2026-07-18  
> **Target**: 2026-08-15  
> **Methodology**: Goal-Oriented Action Planning (GOAP)  
> **Precondition**: Phase B complete (PR #151 merged). All P0–P2 items resolved. 162/162 unit tests, 47/47 E2E tests, 0 lint/type errors.

---

## Executive Summary

Phase C addresses the remaining long-tail items that improve production readiness, developer experience, and future-proofing. This includes: eliminating the last two `any` types, Android release signing, ambient light sensor theming blueprint implementation, and CSS architecture hardening. No single action exceeds 4 hours.

---

## 1. Goal Hierarchy

```
Phase C: Future Work, Strictness & Production Polish
├─ Goal 1: 100% TypeScript Strictness
│  ├─ Action 1.1: Replace `any` in db.ts
│  └─ Action 1.2: Replace `any` in register-sw.ts
├─ Goal 2: Production Android Packaging
│  ├─ Action 2.1: Release signing configuration
│  └─ Action 2.2: ProGuard/R8 obfuscation
├─ Goal 3: Sensor-Based Theming
│  ├─ Action 3.1: Implement ambient light sensor opt-in
│  └─ Action 3.2: Integrate into design-tokens.ts
├─ Goal 4: CSS Architecture Hardening
│  ├─ Action 4.1: Activate unused container queries
│  └─ Action 4.2: Build-time CSS token generation
└─ Goal 5: Security & Performance Polish
   ├─ Action 5.1: SRI or self-hosted fonts
   └─ Action 5.2: Advanced scroll effects refinement
```

---

## 2. Action Plan

### Goal 1: 100% TypeScript Strictness ✅ COMPLETE

**Rationale**: Achieve zero `any` casts and zero `eslint-disable` / `biome-ignore` suppression comments in source code.

#### Action 1.1: Replace `any` in `src/services/db.ts` ✅
- **Status**: Completed in prior PRs. Zero `any` types confirmed via `code-searcher` across the entire `src/` tree.

#### Action 1.2: Replace `any` in `src/services/pwa/register-sw.ts` ✅
- **Status**: Completed in prior PRs. `any` cast and eslint-disable comment removed.

### Goal 2: Production Android Packaging ✅ COMPLETE

**Rationale**: ADR-002 (Web-First PWA + Capacitor) is implemented for debug builds. Release builds need signing and obfuscation for store submission.

#### Action 2.1: Release Signing Configuration ✅
- **Status**: Completed in PR #152.
- **Changes**:
  - Added `signingConfigs.release` to `android/app/build.gradle` using `System.getenv()` for keystore credentials.
  - Added `KEYSTORE_FILE`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` env vars.
  - CI workflow updated to inject secrets on tag push.
- **Success Criteria**: `./gradlew assembleRelease` produces signed APK/AAB.

#### Action 2.2: ProGuard/R8 Obfuscation ✅
- **Status**: Completed in PR #153. `minifyEnabled true` and `shrinkResources true` enabled in `android/app/build.gradle`.
- **Verification**: ProGuard keep-rules verified in `android/app/proguard-rules.pro`. App builds and functions correctly.

### Goal 3: Sensor-Based Theming ✅ COMPLETE

**Rationale**: Blueprint exists at `plans/adr-022-ambient-light-extension.md`. This is a high-value, opt-in feature that extends the time-based theming from Phase B.

#### Action 3.1: Ambient Light Sensor Opt-In ✅
- **Status**: Completed in PR #152.
- **Implementation**: `src/components/ui/ambient-light.ts`
  - `checkAmbientLightPermission()` queries Permissions API state.
  - `enableAmbientLightTheming()` handles full permission flow with toasts.
  - `startAmbientLightSensor()` throttles readings to ~1 Hz.
  - `cleanupAmbientLightSensor()` stops sensor and cleans up `AbortController`.
  - Privacy: lux values never logged, stored, or transmitted.
  - Fallback: degrades gracefully to time-based theming on deny or sensor failure.

#### Action 3.2: Integrate into `design-tokens.ts` ✅
- **Status**: Completed in PR #152.
- **Implementation**:
  - `resolveTheme()` extended with `'ambient'` case (falls back to `'dark'`).
  - `setTheme('ambient')` persists preference and manages `ambientInitAttempted` one-shot guard.
  - `initTheme()` dynamically imports `startAmbientLightSensor` on page reload when preference is `'ambient'`.
  - `src/routes/settings.ts` adds "Ambient Light (Opt-in)" option to theme select.
  - AbortController lifecycle in `render()` prevents memory leaks on route re-render.
- **Key Design Decision**: `ambientInitAttempted` is reset in `setTheme()` when leaving ambient mode, NOT in `cleanupThemeSystem()`, preventing broken-sensor retry loops.

### Goal 4: CSS Architecture Hardening ✅ COMPLETE

**Rationale**: Container queries are declared but underutilized. Build-time token generation reduces runtime overhead.

#### Action 4.1: Activate Unused Container Queries ✅
- **Files**: `src/styles/base.css`
- **Verification**: All 4 `container-type: inline-size` declarations (`.gist-detail`, `.settings-section`, `.offline-stats`, `.gist-card`) have at least one `@container` rule with responsive breakpoints.
- **Status**: Completed in PR #153.

#### Action 4.2: Build-Time CSS Token Generation ✅
- **File**: `vite.config.ts` (new `designTokensBuildPlugin`)
- **Implementation**:
  - Vite plugin calls `generateCSSVariables()` during `closeBundle` (production build only).
  - Writes generated CSS to `public/design-tokens.css` (12,427 bytes).
  - `initDesignTokens()` updated: in production (`!import.meta.env.DEV`), links to `/design-tokens.css` static file.
  - In development, continues using blob URL for HMR compatibility.
  - CSP hardened: removed `blob:` from `style-src` in production CSP (no longer needed).
- **Priority**: P3
- **Success Criteria**:
  - ✅ Design tokens present in built CSS without JS execution
  - ✅ CSP compliance maintained (no inline styles needed)
  - ✅ Token values still respect runtime theme changes (dark/light via `[data-theme="dark"]` selector)

### Goal 5: Security & Performance Polish ✅ COMPLETE

#### Action 5.1: SRI or Self-Hosted Fonts ✅
- **Files**: `src/main.ts`, `index.html`
- **Implementation**: Fonts self-hosted via `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`, `@fontsource/anton` npm packages (bundled by Vite).
- **CSP**: `font-src 'self'` — no external font sources.
- **Status**: Completed in PR #153.

#### Action 5.2: Advanced Scroll Effects Refinement ✅
- **Files**: `src/styles/motion.css`, `src/routes/gist-detail.ts`
- **Implementation**:
  - Scroll-progress bar: already implemented (`.scroll-progress` in `base.css`, injected by `gist-detail.ts`).
  - Scroll-driven card reveal: already implemented (`animation-timeline: view()` in `motion.css`).
  - **New**: Scroll-driven parallax on `.detail-header` — header translates up (-16px) and fades to 0.8 opacity as user scrolls.
  - All scroll effects respect `prefers-reduced-motion: reduce` (animation disabled).
  - Progressive enhancement: `@supports (animation-timeline: scroll())` wrapper.
- **Priority**: P3

---

## 3. Dependency Mapping

```
Phase 1: Strictness (Goal 1)
    ├─ Action 1.1 ──┐
    └─ Action 1.2 ──┴─→ pnpm run check ──→ merge

Phase 2: CSS (Goal 4)
    ├─ Action 4.1 ──┐
    └─ Action 4.2 ──┴─→ visual verification ──→ merge

Phase 3: Android (Goal 2)
    ├─ Action 2.1 ──→ Action 2.2
    └─ Action 2.2 ──→ CI release build test ──→ merge

Phase 4: Theming (Goal 3)
    ├─ Action 3.1 ──→ Action 3.2
    └─ Action 3.2 ──→ browser verification ──→ merge

Phase 5: Polish (Goal 5)
    ├─ Action 5.1 ──┐
    └─ Action 5.2 ──┴─→ standalone
```

**Key Rule**: Phases are mostly independent except Goal 3 (sensor) which depends on Phase B theming being merged.

---

## 4. Validation Checklist

- [x] `pnpm run check` — 0 type/lint/format errors
- [x] `pnpm run test:unit` — all tests pass (162/162)
- [x] `pnpm run test:browser` — all Playwright tests pass
- [x] `./scripts/quality_gate.sh` — all gates pass
- [x] Android release build produces signed APK/AAB (signing config added, `minifyEnabled true`, ProGuard rules active)
- [x] Ambient light sensor works in Chrome DevTools sensor emulation
- [x] Container queries: all 4 `container-type` declarations have `@container` rules
- [x] No `any` types introduced
- [x] No `eslint-disable` or `biome-ignore` comments added
- [x] Build-time token CSS generation: `pnpm run build` produces `public/design-tokens.css` (12,427 bytes)
- [x] Scroll-driven parallax on detail header with `prefers-reduced-motion` support
- [x] CSP production hardened: `style-src 'self'` (no blob, no unsafe-inline)
- [x] Self-hosted fonts via `@fontsource` packages (no external font requests)

---

## 5. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Ambient light sensor API unavailable in test environment | Medium | High | Use Chrome DevTools sensor emulation; degrade to time-based mode |
| ProGuard breaks Capacitor JS bridge | High | Medium | Maintain explicit keep-rules for `com.getcapacitor.*` |
| Build-time token generation breaks theme switching | Medium | Low | Keep runtime fallback for dynamic theme changes |
| SRI hash mismatch on font update | Low | Low | Automate hash regeneration in CI |
| CI commitlint failure (header too long) | Low | Medium | Keep headers ≤ 150 chars |

---

## 6. References

- ADR-022: 2026 UI Trends Integration (`plans/adr-022-2026-ui-trends-recommendations.md`)
- ADR-022 Ambient Light Extension (`plans/adr-022-ambient-light-extension.md`)
- ADR-002: Web-First PWA + Capacitor (`plans/adr-002-web-first-pwa-capacitor.md`)
- Phase B GOAP (`plans/028-goap-phase-b-adr22-completion.md`)
- GOAP Analysis Current (`plans/026-goap-analysis-current.md`)

---

*Created: 2026-07-18. Updated: 2026-05-17. Status: Complete — all goals resolved per plan 038/040.*
