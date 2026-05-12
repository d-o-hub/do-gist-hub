# GOAP Plan — Phase C: Future Work, Strictness & Production Polish

> **Status**: Proposed  
> **Created**: 2026-07-18  
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

### Goal 1: 100% TypeScript Strictness

**Rationale**: Achieve zero `any` casts and zero `eslint-disable` / `biome-ignore` suppression comments in source code.

#### Action 1.1: Replace `any` in `src/services/db.ts`
- **File**: `src/services/db.ts` (line ~16)
- **Current**: `type DBSchemaIndex = any;` with `eslint-disable-next-line`
- **Target**: Define a proper `IDBIndexParameters` compatible type or inline the constraint
- **Priority**: P2
- **Complexity**: Low (~30 min)
- **Success Criteria**:
  - `pnpm run check` passes with zero lint errors
  - IndexedDB operations still compile and test correctly

#### Action 1.2: Replace `any` in `src/services/pwa/register-sw.ts`
- **File**: `src/services/pwa/register-sw.ts` (line ~97)
- **Current**: `(registration as any).sync` with `eslint-disable-next-line`
- **Target**: Already partially typed as `ServiceWorkerRegistration & { sync: SyncManager }`; verify and remove the disable comment
- **Priority**: P2
- **Complexity**: Low (~15 min)
- **Success Criteria**:
  - `pnpm run check` passes with zero lint errors
  - Service worker registration and sync still work

### Goal 2: Production Android Packaging

**Rationale**: ADR-002 (Web-First PWA + Capacitor) is implemented for debug builds. Release builds need signing and obfuscation for store submission.

#### Action 2.1: Release Signing Configuration
- **Files**: `android/app/build.gradle`, `android/gradle.properties`, keystore generation
- **Current**: Debug build only; no release signing config
- **Target**:
  - Generate release keystore (or document GitHub Actions secrets approach)
  - Add `signingConfigs.release` to `build.gradle`
  - Add `KEYSTORE_PASSWORD`, `KEY_PASSWORD` to CI secrets
- **Priority**: P2
- **Complexity**: Medium (~2 hr)
- **Success Criteria**:
  - `./gradlew assembleRelease` produces signed APK/AAB
  - CI workflow can build release artifacts on tag push

#### Action 2.2: ProGuard/R8 Obfuscation
- **File**: `android/app/proguard-rules.pro`
- **Current**: No ProGuard rules
- **Target**:
  - Enable `minifyEnabled true` and `shrinkResources true` for release builds
  - Add ProGuard rules to preserve Capacitor plugin classes and JS bridge
- **Priority**: P3
- **Complexity**: Medium (~2 hr)
- **Success Criteria**:
  - Release APK size is smaller than debug APK
  - App functionality intact after obfuscation

### Goal 3: Sensor-Based Theming

**Rationale**: Blueprint exists at `plans/adr-022-ambient-light-extension.md`. This is a high-value, opt-in feature that extends the time-based theming from Phase B.

#### Action 3.1: Ambient Light Sensor Opt-In
- **File**: New `src/components/ui/ambient-light-prompt.ts`
- **Current**: No ambient light integration
- **Target**:
  - Add a settings toggle "Use Ambient Light Sensor"
  - On enable: request `AmbientLightSensor` permission via Permissions API
  - On grant: instantiate sensor and start reading lux values
  - On deny/unavailable: degrade gracefully to time-based mode
- **Priority**: P3
- **Complexity**: High (~4 hr)
- **Success Criteria**:
  - Sensor permission prompt is user-friendly and explains privacy
  - Sensor readings are throttled (max 1 Hz) to save battery
  - No sensor data is persisted or transmitted

#### Action 3.2: Integrate into `design-tokens.ts`
- **File**: `src/tokens/design-tokens.ts`
- **Current**: `resolveTheme()` supports `light | dark | time`
- **Target**:
  - Add `ambient` preference mode
  - Add `resolveAmbientTheme(lux: number): 'light' | 'dark'`
  - Map thresholds: < 50 lux → dark, 50–200 → dim, > 200 → light
  - Wire sensor callback into `setTheme('ambient')` lifecycle
- **Priority**: P3
- **Complexity**: Medium (~2 hr)
- **Success Criteria**:
  - `setTheme('ambient')` works and stores `'ambient'` in localStorage
  - Theme updates in real-time as ambient light changes
  - Sensor is paused when tab is hidden (visibilitychange)

### Goal 4: CSS Architecture Hardening

**Rationale**: Container queries are declared but underutilized. Build-time token generation reduces runtime overhead.

#### Action 4.1: Activate Unused Container Queries
- **Files**: `src/styles/base.css`, `src/routes/*.ts`
- **Current**: `.gist-card` has `container-type: inline-size` but minimal `@container` rules
- **Target**:
  - Audit all `container-type: inline-size` declarations
  - Add `@container` rules for components that currently rely solely on viewport media queries
  - Focus on: gist list cards, settings panels, offline stats, detail view file tabs
- **Priority**: P2
- **Complexity**: Medium (~2 hr)
- **Success Criteria**:
  - Every `container-type` declaration has at least one `@container` rule
  - Visual regression tests still pass
  - No layout regressions at any breakpoint

#### Action 4.2: Build-Time CSS Token Generation
- **File**: `vite.config.ts` (extend existing token plugin or create new)
- **Current**: `initDesignTokens()` injects CSS at runtime via blob URL
- **Target**:
  - Generate `src/styles/tokens.css` at build time from `src/tokens/design-tokens.ts`
  - Remove runtime blob URL injection (or keep as fallback)
  - Token CSS becomes a static file that Vite hashes and caches
- **Priority**: P3
- **Complexity**: High (~4 hr)
- **Success Criteria**:
  - Design tokens are present in the built CSS without JS execution
  - CSP compliance maintained (no inline styles needed)
  - Token values still respect runtime theme changes (dark/light)

### Goal 5: Security & Performance Polish

#### Action 5.1: SRI or Self-Hosted Fonts
- **File**: `index.html` (Google Fonts `<link>`)
- **Current**: External Google Fonts with no integrity attribute
- **Target**:
  - Either: add `integrity` attribute with SRI hash to font link
  - Or: download and self-host font files in `public/fonts/`
- **Priority**: P3
- **Complexity**: Low (~1 hr)
- **Success Criteria**:
  - Lighthouse "Best Practices" score is 100 (no external resources without SRI)
  - Font loading is still fast (use `font-display: swap`)

#### Action 5.2: Advanced Scroll Effects Refinement
- **Files**: `src/styles/motion.css`, `src/routes/home.ts`, `src/routes/gist-detail.ts`
- **Current**: `animation-timeline: view()` used on gist cards
- **Target**:
  - Add scroll-driven parallax to gist detail header
  - Add scroll-progress indicator to detail view
  - Ensure all scroll effects respect `prefers-reduced-motion`
- **Priority**: P3
- **Complexity**: Medium (~2 hr)
- **Success Criteria**:
  - Effects are disabled when `prefers-reduced-motion: reduce` is active
  - No jank on low-end devices (target 60fps)

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

- [ ] `pnpm run check` — 0 type/lint/format errors
- [ ] `pnpm run test:unit` — all tests pass
- [ ] `pnpm run test:browser` — all Playwright tests pass
- [ ] `./scripts/quality_gate.sh` — all gates pass
- [ ] Android release build produces signed APK/AAB
- [ ] Ambient light sensor works in Chrome DevTools sensor emulation
- [ ] Container queries verified via Playwright `getComputedStyle` checks
- [ ] No `any` types introduced
- [ ] No `eslint-disable` or `biome-ignore` comments added
- [ ] Lighthouse score ≥ 95 (Performance + Best Practices)

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

*Created: 2026-07-18. Status: Proposed.*
