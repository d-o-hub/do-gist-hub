---
name: capacitor-android
description: Package the web app as an Android app using Capacitor, configure WebView, and handle Android-specific concerns.
---

# Capacitor-android Skill

Package the PWA as a native Android app using Capacitor with proper configuration.

## When to Use

- Initial Android packaging
- Updating Capacitor configuration
- Adding native Android features
- Building APK/AAB for distribution

## Workflow

### Step 1: Install Capacitor Dependencies

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
```

### Step 2: Configure Capacitor

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gisthub.app',
  appName: 'Gist Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
```

### Step 3: Add Android Platform

```bash
npx cap add android
npx cap sync android
```

### Step 4: Build and Test

```bash
# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Or run directly
npx cap run android
```

## Android Configuration

### AndroidManifest.xml Essentials

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest>
  <uses-permission android:name="android.permission.INTERNET" />
  <application
    android:usesCleartextTraffic="false"
    android:networkSecurityConfig="@xml/network_security_config">
    <!-- Capacitor handles the rest -->
  </application>
</manifest>
```

### Network Security Config

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
```

### build.gradle Key Settings

```gradle
// android/app/build.gradle
android {
    compileSdkVersion 34
    defaultConfig {
        minSdkVersion 22
        targetSdkVersion 34
    }
}
```

## Gotchas

- **HTTPS Only**: Use `androidScheme: 'https'` for secure communication
- **No Cleartext**: Disable cleartext traffic for security
- **Sync After Build**: Always run `npx cap sync` after web build
- **Min SDK 22**: Android 5.1+ coverage (~99% devices)
- **WebView Updates**: Android System WebView updates independently of app
- **PAT Storage**: Store tokens in Android Keystore, not SharedPreferences

## Required Outputs

- `capacitor.config.ts` - Capacitor configuration
- `android/` directory - Generated Android project
- `android/app/src/main/AndroidManifest.xml` - Permissions configured
- `android/app/src/main/res/xml/network_security_config.xml` - Network security
- Updated `package.json` with Capacitor scripts

## Verification

```bash
# Check Capacitor setup
npx cap doctor

# Verify sync
npx cap sync android

# Run smoke tests
npm run test:android
```

## References

- https://capacitorjs.com/docs/ - Capacitor documentation
- https://capacitorjs.com/docs/android - Android-specific guide
- https://capacitorjs.com/docs/web/progressive-web-apps - PWA integration
- `AGENTS.md` - Security and offline rules
- `pwa-shell` skill - PWA configuration
