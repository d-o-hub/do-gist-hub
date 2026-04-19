# Issue: Deployment and Release Strategy

**Date:** 2024-05-15
**Severity:** low
**Status:** Deferred to V2

## Description
Audit of `scripts/` and root directory confirmed that no automated deployment (e.g., Render, GitHub Actions) or release management logic currently exists in the codebase.

## Current State
- Build process is local/manual (`pnpm build`).
- Android packaging is manual (`pnpm cap:sync`).
- No `render.yaml` or `deploy.sh` detected.

## V2 Requirements
- Configure `render.yaml` for PWA hosting.
- Implement GitHub Actions for automated Playwright testing on PR.
- Add semantic-release for automated versioning and changelog generation.
- Configure Capacitor CD pipeline for Android APK/AAB distribution.

## Verification
- [x] Audit of `scripts/` completed.
- [x] Deployment confirmed as out-of-scope for V1.
