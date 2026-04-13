# ADR-002: Web-First PWA with Capacitor Android

**Status**: Accepted  
**Date**: 2026  
**Deciders**: Architect, Frontend Agent, Android Packaging Agent  

## Context

We need to deliver d.o. Gist Hub that works on:
- Modern web browsers (desktop and mobile)
- Android devices (via native packaging)

Options considered:
1. Web-first PWA + Capacitor
2. React Native / Flutter
3. Separate web and native codebases
4. Tauri for desktop + Capacitor for mobile

## Decision

Build a **web-first PWA** and package it for Android using **Capacitor**.

### Architecture
```
src/ (shared web code)
├── components/
├── services/
├── tokens/
└── routes/

public/
├── manifest.json
└── sw.js (service worker)

capacitor.config.ts (Capacitor config)
android/ (generated Capacitor Android project)
```

### Key Choices
- Single codebase for web and Android
- PWA features available on web
- Capacitor provides native wrapper for Android
- No duplicate logic for platforms

## Tradeoffs

### Pros
- Single codebase maintenance
- PWA installable on any platform
- Faster iteration (web dev workflow)
- Access to native APIs via Capacitor plugins
- Smaller team can ship both platforms

### Cons
- Android WebView limitations
- Performance ceiling of WebView
- Capacitor plugin dependencies
- iOS requires separate Apple developer account
- Some native features may require custom plugins

## Consequences

### Development
- Web developers can work on mobile app
- Standard web tooling (Vite, TypeScript)
- Testing requires browser + Android emulator

### Deployment
- Web: Static hosting (GitHub Pages, Netlify, Vercel)
- Android: APK/AAB distribution

### Limitations
- Must test on actual Android devices
- WebView version varies by Android version
- Some APIs only available in native context

## Rejected Alternatives

### React Native / Flutter
**Rejected because**:
- Requires learning new framework
- Web presence secondary or separate
- Larger bundle sizes
- Overkill for CRUD app

### Separate Codebases
**Rejected because**:
- Double development effort
- Feature parity challenges
- Maintenance burden

### Tauri + Capacitor
**Rejected because**:
- Desktop not in v1 scope
- Adds complexity without clear benefit
- Can add later if needed

## Rollback Triggers

Roll back if:
- Capacitor proves unreliable for target devices
- Performance unacceptable on mid-tier Android
- Critical native APIs unavailable via Capacitor
- Team cannot maintain single codebase effectively

---

*Created: 2026. Status: Active.*
