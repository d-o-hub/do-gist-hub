# Capacitor Android Setup

## Prerequisites
- Android Studio installed
- Java JDK 17+ installed
- `ANDROID_HOME` environment variable set

## Initial Setup

Run these commands once to initialize the Android project:

```bash
# Build the web app first
npm run build

# Initialize Capacitor (if not already done)
npx cap init

# Add Android platform
npx cap add android

# Sync web assets to Android
npm run cap:sync
```

## Development Workflow

```bash
# Build and sync changes
npm run build:android

# Open Android Studio
npm run cap:android:open
```

## Building APK

1. Open Android Studio via `npm run cap:android:open`
2. Go to Build > Build Bundle(s) / APK(s) > Build APK(s)
3. APK will be in `android/app/build/outputs/apk/debug/`

## Configuration

- Config file: `capacitor.config.ts`
- Android project: `android/`
- Web assets directory: `dist/`

## Troubleshooting

### Cannot find Android SDK
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH
export PATH=$ANDROID_HOME/tools:$PATH
```

### Sync errors
```bash
# Clean and resync
rm -rf android
npx cap add android
npm run cap:sync
```
