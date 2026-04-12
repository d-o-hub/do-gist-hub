# Android WebView Guide

> Configuration, behavior, and debugging for Capacitor's Android WebView.

## WebView Overview

Capacitor embeds your web app inside an Android WebView. The WebView is a Chromium-based rendering engine that runs on Android System WebView, which updates independently of your app through Google Play.

### Key Characteristics

| Property | Value |
|----------|-------|
| Engine | Chromium-based (Android System WebView) |
| Updates | Independent via Google Play |
| Min SDK | Android 5.1 (API 22) for Capacitor 6 |
| JavaScript | Full ES2020+ support on modern WebView |
| Service Workers | Supported since Android 5.0 |
| IndexedDB | Supported, 50MB+ storage available |

## Capacitor WebView Configuration

### MainActivity Configuration

The `MainActivity.java` (or `.kt`) in `android/app/src/main/java/` extends `BridgeActivity`:

```java
package com.gisthub.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Capacitor handles the rest automatically
}
```

For Kotlin:

```kotlin
package com.gisthub.app

import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    // Capacitor handles the rest automatically
}
```

### WebView Settings You Can Customize

```java
package com.gisthub.app;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import android.webkit.WebView;
import android.webkit.WebSettings;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // This runs after the WebView is initialized
        // Access the bridge's WebView if needed:
        // Bridge bridge = getBridge();
        // WebView webView = bridge.getWebView();
    }
}
```

### Important: Avoid Overriding WebView Settings

Capacitor manages WebView settings through its configuration. Only override in `MainActivity` when absolutely necessary. Prefer `capacitor.config.ts` settings.

## AndroidManifest.xml Configuration

### Required Permissions

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Required for all network requests -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Required for checking network state (offline detection) -->
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="false"
        android:networkSecurityConfig="@xml/network_security_config">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### Key Manifest Settings

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `usesCleartextTraffic` | `false` | Block unencrypted HTTP |
| `launchMode` | `singleTask` | Prevent multiple app instances |
| `configChanges` | Long list | Handle orientation/keyboard without recreating activity |
| `exported` | `true` | Required for Android 12+ launcher |

## WebView Debugging

### Enable Debugging

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  // ...
  android: {
    webContentsDebuggingEnabled: true,  // Enable chrome://inspect
  },
};
```

**WARNING**: Set to `false` for production builds. Debugging access is a security risk.

### Chrome DevTools Remote Debugging

1. Connect Android device via USB
2. Enable USB Debugging in Developer Options
3. Open Chrome on desktop and navigate to `chrome://inspect`
4. Find your app under "Remote Target"
5. Click "inspect" to open DevTools

You can debug:
- Console output
- Network requests
- IndexedDB contents
- Service Worker status
- Performance profiling
- DOM inspection

### Logcat for Native Logs

```bash
# View all Capacitor/WebView logs
adb logcat | grep -i capacitor

# View only errors
adb logcat *:E

# Filter by your app's package
adb logcat | grep com.gisthub.app

# Clear logcat buffer
adb logcat -c
```

### Useful Logcat Filters

```bash
# JavaScript console.log
adb logcat chromium:I *:S

# Network errors
adb logcat | grep -i "ERR_"

# Service Worker events
adb logcat | grep -i serviceworker

# IndexedDB operations
adb logcat | grep -i indexeddb
```

## WebView Compatibility

### Android System WebView Versions

| Android Version | WebView Version | ES Support |
|-----------------|-----------------|------------|
| Android 5.1 (22) | Chromium 44+ | ES2015 partial |
| Android 7.0 (24) | Chromium 55+ | ES2016+ |
| Android 10 (29) | Chromium 78+ | ES2019+ |
| Android 13 (33) | Chromium 104+ | ES2022+ |

Since WebView updates via Google Play, most devices have recent Chromium even on older Android versions.

### Polyfill Strategy

For the Gist Hub app targeting minSdk 22:

```typescript
// Check what you actually need
// Modern WebView (updated via Play Store) supports most ES2020+
// Only polyfill if targeting very old devices without WebView updates

// Vite handles automatic polyfill injection based on build.target
// vite.config.ts:
export default defineConfig({
  build: {
    target: 'es2015',  // Safe for Android 5.1+
  },
});
```

## Offline Behavior in WebView

### IndexedDB in WebView

```typescript
// IndexedDB works normally in Capacitor WebView
// Storage quota is typically 50MB+ but varies by device

// Check storage quota
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate();
  console.log(`Used: ${estimate.usage} bytes, Quota: ${estimate.quota} bytes`);
}
```

### Service Workers in WebView

Service Workers are supported in Capacitor's WebView. However, for Capacitor apps, the Service Worker is less critical than in a pure PWA because:

1. Assets are loaded from `file://` (always available)
2. The app shell is bundled in the APK
3. IndexedDB handles data persistence

**Recommendation**: Keep the Service Worker for web/PWA install, but rely on IndexedDB for the Android app's offline data layer.

### Detecting Network State in WebView

```typescript
// Use Capacitor's Network plugin for reliable detection
import { Network } from '@capacitor/network';

const status = await Network.getStatus();
console.log(status.connected); // boolean
console.log(status.connectionType); // 'wifi', 'cellular', 'none'

// Listen for changes
Network.addListener('networkStatusChange', (status) => {
  // Trigger sync queue processing when back online
});
```

## Performance Considerations

### WebView Rendering

```html
<!-- Use CSS containment for scroll performance -->
<style>
  .gist-list {
    contain: layout style paint;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
</style>
```

### Memory Management in WebView

The WebView shares a heap with the native app. Be mindful:

1. **Clear large data**: Release gist file content blobs when navigating away
2. **Revoke object URLs**: `URL.revokeObjectURL()` after use
3. **Avoid memory leaks**: Use AbortController for all fetch calls
4. **Monitor with Chrome DevTools**: Check Memory tab for heap snapshots

### Hardware Acceleration

Capacitor enables hardware acceleration by default. For complex rendering:

```xml
<!-- In AndroidManifest.xml activity tag -->
<activity
    android:hardwareAccelerated="true"
    ...>
```

## Common WebView Issues

### Issue: White Flash on Launch

**Cause**: WebView loads before splash screen hides.

**Fix**:
```typescript
// capacitor.config.ts
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    // Or programmatically hide when ready:
  }
}

// In app code:
import { SplashScreen } from '@capacitor/splash-screen';
await SplashScreen.hide(); // Call after app is ready
```

### Issue: Keyboard Overlaps Input

**Cause**: WebView doesn't resize properly when keyboard appears.

**Fix**:
```xml
<!-- In AndroidManifest.xml -->
<activity
    android:windowSoftInputMode="adjustResize"
    ...>
```

### Issue: Back Button Closes App

**Cause**: Default Android back button behavior.

**Fix**:
```typescript
import { App } from '@capacitor/app';

App.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.go(-1);
  } else {
    // Minimize app instead of closing
    App.exitApp();
  }
});
```

### Issue: External Links Don't Open

**Cause**: WebView blocks navigation to external URLs.

**Fix**: Use Capacitor's Browser plugin:
```typescript
import { Browser } from '@capacitor/browser';
await Browser.open({ url: 'https://github.com/...' });
```

Or configure `allowNavigation` in `capacitor.config.ts`.

### Issue: Mixed Content Blocked

**Cause**: HTTPS page loading HTTP resources.

**Fix**: Ensure all API calls use `https://`. The GitHub API supports HTTPS natively.

## Gotchas

1. **WebView != Chrome**: The embedded WebView may differ from desktop Chrome. Test on actual devices
2. **Updates are independent**: Android System WebView updates via Play Store, not app updates
3. **No devtools in production**: `webContentsDebuggingEnabled` must be `false` for release builds
4. **`file://` protocol**: Assets load from `file://`, not `http://localhost`, affecting some browser APIs
5. **Cookie behavior**: Cookies work differently with `file://` origin
6. **LocalStorage limits**: Typically 5-10MB, use IndexedDB for larger data
7. **No extension support**: Browser extensions don't exist in WebView
8. **Gesture navigation**: Android 10+ gesture navigation can conflict with swipe gestures in WebView
9. **Safe area insets**: Use `env(safe-area-inset-*)` for notched devices
10. **Orientation changes**: Handle orientation changes to prevent layout breaks
