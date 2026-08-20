import { getDatabase, id, nowIso } from "./database";
import { recomputeTwin } from "./twin-engine";

export type NativeHealthSample = {
  externalId: string;
  typeCode: string;
  value?: number | null;
  unit?: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  sourceName?: string;
  sourceBundle?: string;
  device?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  deleted?: boolean;
};

const allowedTypes = new Set([
  "steps", "resting_heart_rate", "heart_rate_variability_rmssd", "heart_rate_variability_sdnn",
  "active_energy", "sleep_session", "workout", "vo2_max", "respiratory_rate", "oxygen_saturation",
]);

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function secureCode(length: number) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function createPairingCode(memberId: string, platform: "ios" | "android") {
  const db = await getDatabase();
  const code = secureCode(8);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await db.prepare("INSERT INTO companion_pairing_codes (id, member_id, code_hash, platform, expires_at, consumed_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)")
    .bind(id("pair"), memberId, await sha256(code), platform, expiresAt, now).run();
  return { code, platform, expiresAt };
}

export async function registerCompanion(input: { pairingCode: string; platform: "ios" | "android"; deviceName: string; appVersion: string }) {
  const db = await getDatabase();
  const codeHash = await sha256(input.pairingCode.trim().toUpperCase());
  const pairing = await db.prepare("SELECT * FROM companion_pairing_codes WHERE code_hash=? AND platform=?").bind(codeHash, input.platform).first<Record<string, unknown>>();
  if (!pairing || pairing.consumed_at || String(pairing.expires_at) < nowIso()) throw new Error("Pairing code is invalid or expired");
  const token = `${secureCode(24)}${secureCode(24)}`;
  const installationId = id("device");
  const now = nowIso();
  await db.batch([
    db.prepare("UPDATE companion_pairing_codes SET consumed_at=? WHERE id=? AND consumed_at IS NULL").bind(now, pairing.id),
    db.prepare("INSERT INTO device_installations (id, member_id, platform, device_name, app_version, token_hash, status, last_sync_at, last_cursor, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', NULL, NULL, ?, ?)")
      .bind(installationId, pairing.member_id, input.platform, input.deviceName.slice(0, 100), input.appVersion.slice(0, 30), await sha256(token), now, now),
  ]);
  return { installationId, token, memberId: String(pairing.member_id) };
}

export async function authenticateInstallation(authorization: string | null) {
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const db = await getDatabase();
  return db.prepare("SELECT * FROM device_installations WHERE token_hash=? AND status='active'").bind(await sha256(token)).first<Record<string, unknown>>();
}

export async function ingestNativeBatch(installation: Record<string, unknown>, input: { idempotencyKey: string; cursor?: string | null; samples: NativeHealthSample[] }) {
  if (!input.idempotencyKey || input.idempotencyKey.length > 120) throw new Error("A valid idempotency key is required");
  if (!Array.isArray(input.samples) || input.samples.length > 500) throw new Error("A batch may contain at most 500 samples");
  const db = await getDatabase();
  const existing = await db.prepare("SELECT * FROM native_sync_batches WHERE installation_id=? AND idempotency_key=?").bind(installation.id, input.idempotencyKey).first<Record<string, unknown>>();
  if (existing) return { batchId: existing.id, inserted: existing.inserted_count, deleted: existing.deleted_count, duplicate: true, cursor: existing.platform_cursor };
  const now = nowIso();
  const batchId = id("nativebatch");
  await db.prepare("INSERT INTO native_sync_batches (id, installation_id, member_id, idempotency_key, platform_cursor, sample_count, inserted_count, deleted_count, status, error, received_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'processing', NULL, ?, NULL)")
    .bind(batchId, installation.id, installation.member_id, input.idempotencyKey, input.cursor ?? null, input.samples.length, now).run();
  let inserted = 0; let deleted = 0;
  const affectedDays = new Set<string>();
  try {
    for (const sample of input.samples) {
      if (!sample.externalId || !allowedTypes.has(sample.typeCode)) continue;
      if (!Number.isFinite(Date.parse(sample.startAt)) || !Number.isFinite(Date.parse(sample.endAt))) continue;
      affectedDays.add(sample.startAt.slice(0, 10));
      if (sample.deleted) {
        const previous = await db.prepare("SELECT start_at FROM native_health_samples WHERE installation_id=? AND external_id=? AND deleted_at IS NULL").bind(installation.id, sample.externalId).first<{ start_at: string }>();
        if (previous?.start_at) affectedDays.add(previous.start_at.slice(0, 10));
        const result = await db.prepare("UPDATE native_health_samples SET deleted_at=?, updated_at=? WHERE installation_id=? AND external_id=? AND deleted_at IS NULL")
          .bind(now, now, installation.id, sample.externalId).run();
        deleted += Number(result.meta.changes ?? 0);
        continue;
      }
      await db.prepare(`INSERT INTO native_health_samples (id, installation_id, member_id, platform, external_id, type_code, value_number, unit, start_at, end_at, timezone, source_name, source_bundle, device_json, metadata_json, deleted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
        ON CONFLICT(installation_id, external_id) DO UPDATE SET type_code=excluded.type_code, value_number=excluded.value_number, unit=excluded.unit, start_at=excluded.start_at, end_at=excluded.end_at, timezone=excluded.timezone, source_name=excluded.source_name, source_bundle=excluded.source_bundle, device_json=excluded.device_json, metadata_json=excluded.metadata_json, deleted_at=NULL, updated_at=excluded.updated_at`)
        .bind(id("sample"), installation.id, installation.member_id, installation.platform, sample.externalId, sample.typeCode, sample.value ?? null, sample.unit ?? null, sample.startAt, sample.endAt, sample.timezone || "UTC", sample.sourceName ?? "Health", sample.sourceBundle ?? "unknown", JSON.stringify(sample.device ?? {}), JSON.stringify(sample.metadata ?? {}), now, now).run();
      inserted++;
    }
    for (const day of affectedDays) await rebuildNativeDay(String(installation.member_id), String(installation.platform), day);
    await db.batch([
      db.prepare("UPDATE native_sync_batches SET inserted_count=?, deleted_count=?, status='completed', completed_at=? WHERE id=?").bind(inserted, deleted, nowIso(), batchId),
      db.prepare("UPDATE device_installations SET last_sync_at=?, last_cursor=?, updated_at=? WHERE id=?").bind(nowIso(), input.cursor ?? null, nowIso(), installation.id),
    ]);
    await recomputeTwin(String(installation.member_id));
    return { batchId, inserted, deleted, duplicate: false, cursor: input.cursor ?? null };
  } catch (error) {
    await db.prepare("UPDATE native_sync_batches SET status='failed', error=?, completed_at=? WHERE id=?").bind(error instanceof Error ? error.message : "Sync failed", nowIso(), batchId).run();
    throw error;
  }
}

async function rebuildNativeDay(memberId: string, platform: string, day: string) {
  const db = await getDatabase();
  const rows = await db.prepare("SELECT type_code,value_number,start_at,end_at,timezone FROM native_health_samples WHERE member_id=? AND platform=? AND substr(start_at,1,10)=? AND deleted_at IS NULL")
    .bind(memberId, platform, day).all<{ type_code: string; value_number: number | null; start_at: string; end_at: string; timezone: string }>();
  const values = rows.results;
  const sum = (code: string) => values.filter((row) => row.type_code === code).reduce((total, row) => total + Number(row.value_number ?? 0), 0) || null;
  const avg = (code: string) => { const matching = values.filter((row) => row.type_code === code && row.value_number !== null); return matching.length ? matching.reduce((total, row) => total + Number(row.value_number), 0) / matching.length : null; };
  const sleepMinutes = values.filter((row) => row.type_code === "sleep_session").reduce((total, row) => total + Math.max(0, (Date.parse(row.end_at) - Date.parse(row.start_at)) / 60_000), 0) || null;
  const workoutMinutes = values.filter((row) => row.type_code === "workout").reduce((total, row) => total + Math.max(0, (Date.parse(row.end_at) - Date.parse(row.start_at)) / 60_000), 0) || null;
  const rawHash = await sha256(`${memberId}:${platform}:${day}:${JSON.stringify(values)}`);
  await db.prepare(`INSERT INTO wearable_daily (id, member_id, provider, day, timezone, sleep_minutes, sleep_score, hrv_rmssd, resting_hr, steps, active_calories, workout_minutes, quality, raw_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(member_id,provider,day) DO UPDATE SET timezone=excluded.timezone,sleep_minutes=excluded.sleep_minutes,hrv_rmssd=excluded.hrv_rmssd,resting_hr=excluded.resting_hr,steps=excluded.steps,active_calories=excluded.active_calories,workout_minutes=excluded.workout_minutes,quality=excluded.quality,raw_hash=excluded.raw_hash`)
    .bind(id("wear"), memberId, platform === "ios" ? "apple_health" : "health_connect", day, values[0]?.timezone ?? "UTC", sleepMinutes, avg("heart_rate_variability_rmssd"), avg("resting_heart_rate"), sum("steps"), sum("active_energy"), workoutMinutes, values.length ? .94 : .4, rawHash, nowIso()).run();
  const sdnn = avg("heart_rate_variability_sdnn");
  if (sdnn !== null) await db.prepare("INSERT INTO observations (id, member_id, concept_code, domain, value_number, value_text, unit, effective_at, source, quality, metadata_json, created_at) VALUES (?, ?, 'hrv_sdnn_daily', 'recovery', ?, NULL, 'ms', ?, 'Apple Health', 'accepted', ?, ?)")
    .bind(id("obs"), memberId, sdnn, `${day}T23:59:59.000Z`, JSON.stringify({ metricDefinition: "SDNN; not interchangeable with RMSSD", platform }), nowIso()).run();
}

export async function listCompanions(memberId: string) {
  const db = await getDatabase();
  const rows = await db.prepare("SELECT id,platform,device_name,app_version,status,last_sync_at,last_cursor,created_at FROM device_installations WHERE member_id=? ORDER BY updated_at DESC").bind(memberId).all<Record<string, unknown>>();
  return rows.results;
}
