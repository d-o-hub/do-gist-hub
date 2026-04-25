# Issue: Android Hardware Deferred Testing

**Date:** 2024-05-15
**Severity:** medium
**Status:** Deferred (Hardware Required)

## Description
E2E testing on real Android hardware is deferred due to lack of physical device access in the current environment. Capacitor and PWA features have been verified via configuration and mobile emulation.

## Items Requiring Real Device Verification
- **Native Keyboards**: Verify that the input fields are not obscured by the soft keyboard (especially in `gist-edit.ts`).
- **Capacitor Plugins**: Test the `SplashScreen` plugin behavior on a cold boot.
- **Biometric/Storage**: Verify that the Web Cryptography API and IndexedDB persistence behave correctly after a device reboot.
- **Safe Areas**: Confirm that `env(safe-area-inset-bottom)` correctly padds the `bottom-nav` on devices with gesture navigation bars.
- **Haptic Feedback**: (Future) Test any native haptic feedback integrations.

## Verification (Emulation Only)
- [x] `capacitor.config.ts` matches `src/config/app.config.ts`
- [x] Responsive layout verified at 390px (Mobile)
- [x] Safe area CSS variables implemented in `base.css` and `navigation.css`

## Related Issues
- [Playwright Mobile Emulation Results](analysis/tests/mobile-emulation.md)
