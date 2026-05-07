<!-- Last Audit: 2026-05-07 -->

# Android Packaging

## Capacitor Configuration

- **Config**: `capacitor.config.ts` - appId: `com.dogisthub.app`, webDir: `dist`
- **Android Scheme**: HTTPS with cleartext disabled
- **Splash Screen**: 2s duration, blue background (#2563eb), spinner enabled

## Build Process

```bash
npm run build        # Vite production build to dist/
npm run cap:sync     # Sync Capacitor with native project
cd android && ./gradlew assembleDebug  # Build debug APK
```

## WebView Validation

- `tests/android/capacitor-smoke.spec.ts` - Smoke tests for Capacitor Android
- PWA functionality verified in WebView context
- Offline support via Service Worker in WebView

## Production Readiness Checklist

- [x] Capacitor 6 configured
- [x] Android project structure in `android/` folder
- [x] HTTPS scheme (no cleartext)
- [x] Splash screen configured
- [x] Service Worker generates at build time (`src/sw/sw.ts` → `dist/sw.js`)
- [x] App config derived from single source (`src/config/app.config.ts`)
- [ ] Release signing configuration (for production APK/AAB)
- [ ] Google Play Store metadata preparation
- [ ] ProGuard/R8 obfuscation (optional, recommend for production)

## Known Limitations

- WebKit (iOS) IndexedDB evaluation may hang in CI - tests skipped
- Some WebKit layout assertions flaky in Playwright - conditional skips in place

---

_Created: 2026. Last Updated: 2026-05-07. Status: Production ready (debug builds), release signing pending for store deployment._
