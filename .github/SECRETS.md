# GitHub Actions secrets

The pull-request workflows build the web app, an unsigned Android debug APK/AAB, and an unsigned iOS simulator app without secrets. Only **Signed Native Release** consumes signing credentials.

## Android release

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64 of the Google Play upload `.jks` keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Upload key alias |
| `ANDROID_KEY_PASSWORD` | Upload key password |

Create the base64 value on macOS with `base64 -i release-upload.jks | pbcopy`, or on Linux with `base64 -w 0 release-upload.jks`.

## iOS release

| Secret | Value |
|---|---|
| `APPLE_TEAM_ID` | Apple Developer team identifier |
| `IOS_BUNDLE_ID` | Registered HealthKit-capable bundle ID, normally `com.antiaginglabs.companion` |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | Base64 of the Apple Distribution `.p12` |
| `IOS_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64 of an App Store distribution `.mobileprovision` containing HealthKit entitlements |
| `IOS_KEYCHAIN_PASSWORD` | A long random value used only for the temporary CI keychain |

## Release procedure

1. In GitHub, open **Actions → Signed Native Release → Run workflow**.
2. Enter a semantic version, a new monotonically increasing build number, and the production HTTPS API URL.
3. Download the signed APK, AAB, IPA, mapping file, and dSYMs from the workflow run.
4. Upload the AAB to a closed Google Play track and the IPA to TestFlight. Store upload automation is intentionally not enabled until the Play and App Store Connect applications exist.

Use a protected GitHub Environment for release secrets, require reviewer approval, and rotate a credential immediately if a run exposes it.
