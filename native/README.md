# Antiaging Labs companion apps

These thin native companions bridge device-local health stores to the Member OS. They deliberately do not reproduce the web product: the native UI pairs a phone, asks for per-category permission, performs incremental synchronization, shows source attribution, and opens the PWA for the full experience.

## Shared server contract

1. The signed-in member creates an eight-character code at **Data → Direct phone sync**.
2. The companion exchanges it at `POST /api/native/register`. The returned installation token is stored in Keychain/EncryptedSharedPreferences and is never shown again.
3. Batches go to `POST /api/native/sync` with the installation token, a unique idempotency key, the platform cursor/anchor, upserts, and deletions.
4. The server deduplicates by installation + external sample ID, rebuilds affected daily aggregates, preserves source/device/timezone metadata, and recomputes connected Twin domains.

Set the production base URL in the native build configuration. App Store/Play signing, privacy declarations, HealthKit entitlements, and production distribution credentials remain release-account steps.

## iOS

Open `native/ios/AntiagingCompanion` in an Xcode iOS application target, add the HealthKit capability and background delivery entitlement, and include the Swift sources. The implementation uses observer delivery to wake the app and anchored object queries to read additions and deletions. Anchors are saved only after a server batch succeeds.

## Android

Open `native/android` in Android Studio. Configure the production URL through `BuildConfig.MEMBER_OS_BASE_URL`. Health Connect permissions are requested per record type; WorkManager performs periodic reconciliation. A change token is stored per record family and a 30-day read-and-dedupe fallback handles expired tokens.
