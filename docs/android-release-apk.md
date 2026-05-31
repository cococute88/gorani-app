# Android release APK build

Use this flow when building an APK file that will be copied to a device and installed directly.

## Requirements

- A local `.env` file must exist at the repository root.
- Do not commit `.env`, APK files, keystores, bot tokens, API keys, or chat IDs.
- The release APK embeds `EXPO_PUBLIC_*` values into the JavaScript bundle at build time.

The release build requires these public client keys to be present:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_DATABASE_URL`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_CF_WORKER_URL`
- `EXPO_PUBLIC_GORANI_WORKER_API_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

These values are public client configuration once shipped in an APK. In particular, `EXPO_PUBLIC_GORANI_WORKER_API_KEY` can be extracted from the APK, so the Cloudflare Worker must continue to treat it only as a lightweight app gate and not as a strong secret.

## Build

Check that all required public env keys are present:

```bash
npm.cmd run check:public-env
```

Build the release APK with `.env` loaded into the Gradle process:

```bash
npm.cmd run android:apk:release
```

APK output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

## Install Test

```bash
adb uninstall com.gorani.finance.assistant
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell monkey -p com.gorani.finance.assistant 1
```

After launch, verify:

- The app opens without a Firebase env missing error.
- Google login can start.
- The Notifications tab opens.
- Local push diagnostics can be reached.
- Telegram test flow can be reached after login/settings are configured.

If the app reports a missing Firebase env key, rebuild with `npm.cmd run android:apk:release` instead of running `gradlew.bat assembleRelease` directly.
