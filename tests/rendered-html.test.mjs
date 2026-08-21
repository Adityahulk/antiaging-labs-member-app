import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const file = (path) => readFile(new URL(path, root), "utf8");

test("ships the complete member experience instead of the starter", async () => {
  const [home, layout, shell, styles] = await Promise.all([
    file("app/page.tsx"),
    file("app/layout.tsx"),
    file("components/member-shell.tsx"),
    file("app/globals.css"),
  ]);
  assert.match(home, /TodayExperience/);
  assert.match(layout, /Antiaging Labs/);
  assert.match(shell, /Twin/);
  assert.match(shell, /Protocol/);
  assert.match(styles, /expanded-map/);
  assert.doesNotMatch(home, /SkeletonPreview|codex-preview/);
});

test("contains Phase 1A operational workflows", async () => {
  const [schema, checkout, upload, reports, protocol, admin] =
    await Promise.all([
      file("db/schema.ts"),
      file("app/api/payments/checkout/route.ts"),
      file("lib/upload-processing.ts"),
      file("lib/report-engine.ts"),
      file("lib/protocol-engine.ts"),
      file("components/workflow-experiences.tsx"),
    ]);
  assert.match(schema, /catalogVersions/);
  assert.match(schema, /orderEvents/);
  assert.match(schema, /paymentAttempts/);
  assert.match(checkout, /Idempotency-Key/);
  assert.match(checkout, /razorpay/);
  assert.match(upload, /processUpload/);
  assert.match(reports, /status = 'ready'/);
  assert.match(protocol, /status = 'current'/);
  assert.match(admin, /CONCIERGE FULFILLMENT/);
});

test("contains Phase 1B wearable fusion and daily adaptation", async () => {
  const [wearables, importers, twin, daily, connections] = await Promise.all([
    file("lib/wearables.ts"),
    file("lib/importers.ts"),
    file("lib/twin-engine.ts"),
    file("lib/daily-jobs.ts"),
    file("components/workflow-experiences.tsx"),
  ]);
  assert.match(wearables, /openWearablesRequest/);
  assert.match(importers, /parseAppleHealth/);
  assert.match(importers, /parseGarmin/);
  assert.match(twin, /validDays/);
  assert.match(twin, /confidence/);
  assert.match(twin, /generateDailyAdjustment/);
  assert.match(daily, /runDailyJobs/);
  assert.match(connections, /DIRECT CONNECTIONS/);
});

test("includes deployable migrations and all core routes", async () => {
  const required = [
    "drizzle/0000_brave_ozymandias.sql",
    "drizzle/0001_modern_mandrill.sql",
    "drizzle/0002_absurd_starjammers.sql",
    "app/api/twin/recompute/route.ts",
    "app/api/reports/generate/route.ts",
    "app/api/protocols/generate/route.ts",
    "app/api/wearables/connect/[provider]/route.ts",
    "app/admin/clients/[id]/page.tsx",
  ];
  await Promise.all(required.map((path) => access(new URL(path, root))));
  assert.equal(required.length, 8);
});

test("contains Phase 2 genomic ingestion, cross-modal fusion, and supervised drafting", async () => {
  const [schema, genomics, fusion, drafting, reports, admin, geneticsUi] =
    await Promise.all([
      file("db/schema.ts"),
      file("lib/genomics.ts"),
      file("lib/cross-modal.ts"),
      file("lib/ai-drafting.ts"),
      file("lib/report-engine.ts"),
      file("app/api/admin/overview/route.ts"),
      file("components/genetics-experience.tsx"),
    ]);
  assert.match(schema, /genomicArtifacts/);
  assert.match(schema, /genomicVariantCalls/);
  assert.match(schema, /genomicReanalysisRuns/);
  assert.match(schema, /crossModalFindings/);
  assert.match(schema, /chatReviews/);
  assert.match(genomics, /parseVcf/);
  assert.match(genomics, /parseRawArray/);
  assert.match(genomics, /possibleApoeDiplotypes/);
  assert.match(genomics, /callRate/);
  assert.match(fusion, /laboratory/);
  assert.match(fusion, /wearable/);
  assert.match(fusion, /genetics/);
  assert.match(fusion, /intake/);
  assert.match(drafting, /allowedGroundingRefs/);
  assert.match(reports, /genetics-report-v2/);
  assert.match(admin, /chatAudits/);
  assert.match(geneticsUi, /REPRODUCIBLE HISTORY/);
});

test("ships Phase 2 routes, fixtures, and vendor-neutral lab activation", async () => {
  const required = [
    "app/genetics/page.tsx",
    "app/api/genomics/route.ts",
    "app/api/genomics/[id]/reanalyse/route.ts",
    "app/api/genomics/[id]/review/route.ts",
    "app/api/admin/chat/[id]/review/route.ts",
    "app/api/admin/orders/[id]/submit-lab/route.ts",
    "tests/fixtures/genetics-array-grch37.txt",
    "tests/fixtures/genetics-small-grch38.vcf",
  ];
  await Promise.all(required.map((path) => access(new URL(path, root))));
  const [lab, webhook, chat] = await Promise.all([
    file("lib/lab-adapter.ts"),
    file("app/api/webhooks/[provider]/route.ts"),
    file("app/api/chat/route.ts"),
  ]);
  assert.match(lab, /Idempotency-Key/);
  assert.match(webhook, /lab_adapter/);
  assert.match(chat, /toolCalls/);
  assert.match(chat, /geneticInterpretationIds/);
});

test("contains Phase 3 native sync, outcome validation, experiments, and interoperability", async () => {
  const required = [
    "drizzle/0003_dashing_black_tarantula.sql",
    "app/outcomes/page.tsx",
    "app/experiments/page.tsx",
    "app/api/native/register/route.ts",
    "app/api/native/sync/route.ts",
    "app/api/admin/models/train/route.ts",
    "app/api/interoperability/fhir/export/route.ts",
    "native/ios/AntiagingCompanion/HealthKitSyncStore.swift",
    "native/android/app/src/main/java/com/antiaginglabs/companion/HealthConnectSyncManager.kt",
  ];
  await Promise.all(required.map((path) => access(new URL(path, root))));
  const [schema, native, outcomes, models, experiments, fhir, ui] =
    await Promise.all([
      file("db/schema.ts"),
      file("lib/native-health.ts"),
      file("lib/phase3.ts"),
      file("lib/response-models.ts"),
      file("components/phase3-experiences.tsx"),
      file("lib/interoperability.ts"),
      file("components/member-shell.tsx"),
    ]);
  assert.match(schema, /nativeHealthSamples/);
  assert.match(schema, /responseModelVersions/);
  assert.match(schema, /experimentPeriods/);
  assert.match(native, /idempotencyKey/);
  assert.match(native, /deleted_at/);
  assert.match(outcomes, /minimumCell/);
  assert.match(models, /Temporal/);
  assert.match(models, /abstained/);
  assert.match(experiments, /YOUR N-OF-1 LAB/);
  assert.match(fhir, /FHIR R4/);
  assert.match(fhir, /Provenance/);
  assert.match(ui, /Progress/);
  assert.match(ui, /Experiments/);
});

test("ships reproducible web, Android, and iOS build pipelines", async () => {
  const required = [
    ".github/workflows/web-ci.yml",
    ".github/workflows/native-build.yml",
    ".github/workflows/native-release.yml",
    "native/android/gradle.properties",
    "native/android/app/proguard-rules.pro",
    "native/android/app/src/main/java/com/antiaginglabs/companion/SecureTokenStore.kt",
    "native/android/app/src/main/java/com/antiaginglabs/companion/HealthSyncWorker.kt",
    "native/ios/project.yml",
    "native/ios/AntiagingCompanion/Info.plist",
    "native/ios/AntiagingCompanion/PrivacyInfo.xcprivacy",
    "native/ios/ExportOptions-AppStore.plist",
    "docs/DEPLOYMENT_AND_INTEGRATIONS.md",
  ];
  await Promise.all(required.map((path) => access(new URL(path, root))));
  const [nativeCi, release, android, ios, secrets] = await Promise.all([
    file(".github/workflows/native-build.yml"),
    file(".github/workflows/native-release.yml"),
    file("native/android/app/build.gradle.kts"),
    file("native/ios/project.yml"),
    file(".github/SECRETS.md"),
  ]);
  assert.match(nativeCi, /assembleDebug/);
  assert.match(nativeCi, /iphonesimulator/);
  assert.match(release, /assembleRelease/);
  assert.match(release, /-exportArchive/);
  assert.match(android, /ANDROID_KEYSTORE_PATH/);
  assert.match(android, /https:\/\//);
  assert.match(ios, /AntiagingCompanion\.entitlements/);
  assert.match(secrets, /ANDROID_KEYSTORE_BASE64/);
  assert.match(secrets, /IOS_DISTRIBUTION_CERTIFICATE_BASE64/);
});

test("configures the Worker background processing trigger", async () => {
  const [vite, worker, jobs] = await Promise.all([
    file("vite.config.ts"),
    file("worker/index.ts"),
    file("lib/daily-jobs.ts"),
  ]);
  assert.match(vite, /crons:\s*\["0 2 \* \* \*"\]/);
  assert.match(worker, /async scheduled/);
  assert.match(jobs, /syncWearableWithTelemetry/);
  assert.match(jobs, /runPhase3Jobs/);
});

test("ships closed-alpha auth without automatic production demo or first-user admin", async () => {
  const [member, seed, gate, shell, env] = await Promise.all([
    file("lib/member.ts"), file("lib/seed.ts"), file("app/auth-gate.tsx"), file("components/member-shell.tsx"), file(".env.example"),
  ]);
  assert.match(member, /ALLOW_DEMO_AUTH === "true"/);
  assert.match(member, /Authentication required/);
  assert.doesNotMatch(seed, /memberCount.*<= 1/);
  assert.match(seed, /ADMIN_EMAILS/);
  assert.match(seed, /SEED_DEMO_DATA/);
  assert.match(gate, /Sign in securely/);
  assert.match(shell, /signout-with-chatgpt/);
  assert.match(env, /ADMIN_EMAILS/);
});

test("supports manual concierge fulfillment and verified D1 backups", async () => {
  const [orderRoute, ui, backups, daily, schema, migration] = await Promise.all([
    file("app/api/admin/orders/[id]/route.ts"), file("components/workflow-experiences.tsx"), file("lib/backups.ts"), file("lib/daily-jobs.ts"), file("db/schema.ts"), file("drizzle/0005_friendly_dexter_bennett.sql"),
  ]);
  assert.match(orderRoute, /externalReference/);
  assert.match(orderRoute, /publicMessage/);
  assert.match(orderRoute, /internalNote/);
  assert.match(ui, /Manage booking details/);
  assert.match(ui, /Tracking link/);
  assert.doesNotMatch(ui, /Send to lab/);
  assert.match(backups, /system-backups\/d1/);
  assert.match(backups, /verifyDatabaseBackup/);
  assert.match(daily, /maybeCreateScheduledBackup/);
  assert.match(schema, /backupRuns/);
  assert.match(migration, /CREATE TABLE `backup_runs`/);
});
