# Agent Documentation Summary

## Overview
This directory serves as the persistent memory and self-learning database for AI agents working on d.o. Gist Hub.

## Key Learning (May 2024 Audit)
- **Mobile-First Navigation**: Navigation components must be `display: none` by default to prevent layout shifts.
- **Dynamic Viewports**: Always use `100dvh` for full-height app containers to account for mobile browser UI.
- **Testing Integrity**: A "Completed" status in `plans/` must be backed by a corresponding Playwright test; several gaps were identified and stubbed.
- **Hardware Limitations**: Real device testing for Android remains deferred and must be verified on physical hardware or a device farm.

## Directory Structure
- `patterns/`: Best practices and anti-patterns for CSS and component architecture.
- `issues/`: Log of detected problems and their resolution status.
- `fixes/`: Documentation of specific complex bug fixes.
- `detected/`: (Temp) automated scan results from `autosearch-issues.sh`.

## Recent Fixes
- Fixed `css_missing_base_display` across all stylesheets.
- Fixed `css_no_dvh` in `base.css`.
- Re-formatted `gist-store.ts` and `gist-detail.ts` to resolve build-breaking syntax errors.

## Final Achievements
- **Resolved Pre-existing Type Errors**: Fixed significant type mismatches and syntax errors across `sync/queue.ts`, `gist-store.ts`, `gist-detail.ts`, and `db.ts`.
- **Achieved Green Build**: Passed all quality gates including typecheck, lint, and format.
- **Visual Validation**: All 3 key breakpoints (mobile, tablet, desktop) verified for zero overflow and correct nav patterns.
