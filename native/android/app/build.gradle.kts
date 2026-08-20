plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("org.jetbrains.kotlin.plugin.compose") }
android { namespace="com.antiaginglabs.companion"; compileSdk=36
  defaultConfig { applicationId="com.antiaginglabs.companion"; minSdk=28; targetSdk=36; versionCode=1; versionName="1.0"; buildConfigField("String","MEMBER_OS_BASE_URL","\"https://app.antiaging-labs.com\"") }
  buildFeatures { compose=true; buildConfig=true }
}
dependencies { implementation("androidx.activity:activity-compose:1.11.0"); implementation("androidx.compose.material3:material3:1.4.0"); implementation("androidx.health.connect:connect-client:1.1.0"); implementation("androidx.work:work-runtime-ktx:2.10.3"); implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2"); implementation("com.squareup.okhttp3:okhttp:5.1.0"); implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0") }
