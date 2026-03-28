# EAS Development Build Setup Guide

## Prerequisites
- **Expo account**: ✅ (expo.dev)
- **Xcode**: ✅ installed
- **Apple Developer account**: ❌ not needed for local builds (free Apple ID works)
- **iPhone + USB cable**: needed for device install

## Step 1: Install dependencies

```bash
cd /Users/devinpatel/Desktop/herocards-native
npx expo install expo-dev-client
```

## Step 2: Install EAS CLI (optional, for future cloud builds)

```bash
npm install -g eas-cli
eas login
```

## Step 3: Update `app.json`

Add the iOS bundle identifier and fix the theme colors:

```json
{
  "expo": {
    "name": "HeroCards",
    "slug": "HeroCards",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#050508"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.devinpatel.herocards"
    }
  }
}
```

Key changes from current config:
- `userInterfaceStyle`: `"light"` → `"dark"`
- `splash.backgroundColor`: `"#ffffff"` → `"#050508"` (matches T.bg.root)
- `ios.bundleIdentifier`: added `"com.devinpatel.herocards"`

## Step 4: Create `eas.json`

Create this file in the project root:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

## Step 5: Build and install on iPhone

### Option A: Local build (no Apple Developer Program needed)

Plug in your iPhone via USB, then:

```bash
npx expo run:ios --device
```

- This generates the `ios/` directory with the native Xcode project
- Xcode will sign with your free Apple ID (select your team if prompted)
- The app builds locally and installs directly to your iPhone
- First build takes ~5-10 minutes; subsequent builds are faster

### Option B: EAS cloud build (requires paid Apple Developer account — $99/yr)

```bash
eas build --platform ios --profile development
```

- Builds on Expo's servers (~15-20 min)
- EAS handles signing certificates automatically
- Install via QR code on your phone

## Step 6: Run with hot reload

After the app is installed on your phone:

```bash
npx expo start --dev-client
```

This starts Metro bundler. The app on your phone connects to it — you get the same hot reload experience as Expo Go, but running your own standalone app.

## Notes

- **First build only**: Xcode may ask you to trust the developer certificate on your iPhone. Go to Settings → General → VPN & Device Management → trust your developer profile.
- **Free Apple ID limitation**: Apps signed with a free Apple ID expire after 7 days. You'll need to rebuild and reinstall weekly. A paid Apple Developer account removes this limit.
- **Firebase**: Your Firebase config should work as-is since you're using the web SDK. No need to add a GoogleService-Info.plist.
- **When you get an Apple Developer account**: Switch to EAS cloud builds (`eas build --platform ios --profile development`) for a smoother workflow, and you'll be ready for TestFlight / App Store submission.
