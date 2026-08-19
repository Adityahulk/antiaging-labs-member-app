import { env } from "cloudflare:workers";
import { getDatabase, id, nowIso } from "./database";
import { parseHealthFile, type ImportedObservation } from "./importers";
import { runtimeConfig } from "./integrations";
import { recomputeTwin } from "./twin-engine";
import { unzipSync } from "fflate";

type UploadEnv = { UPLOADS?: R2Bucket };

export async function processUpload(memberId: string, uploadId: string) {
  const db = await getDatabase(); const now = nowIso(); const upload = await db.prepare("SELECT * FROM uploads WHERE id = ? AND member_id = ?").bind(uploadId, memberId).first<Record<string, unknown>>(); if (!upload) throw new Error("Upload not found");
  const jobId = id("job"); await db.prepare("INSERT INTO processing_jobs (id, member_id, upload_id, type, status, progress, result_json, error, created_at, updated_at) VALUES (?, ?, ?, ?, 'processing', 10, '{}', NULL, ?, ?)").bind(jobId, memberId, uploadId, upload.type, now, now).run();
  try {
    const bucket = (env as unknown as UploadEnv).UPLOADS; if (!bucket) throw new Error("Upload storage unavailable"); const object = await bucket.get(String(upload.object_key)); if (!object) throw new Error("Stored file missing");
    const bytes = await object.arrayBuffer(); let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes); let effectiveName=String(upload.file_name);
    if(String(upload.content_type)==="application/zip"||effectiveName.toLowerCase().endsWith(".zip")){const entries=unzipSync(new Uint8Array(bytes));const target=Object.entries(entries).find(([name])=>/export\.xml$/i.test(name))??Object.entries(entries).find(([name])=>/\.(csv|json|xml|txt)$/i.test(name));if(!target)throw new Error("ZIP does not contain a supported health export");effectiveName=target[0];text=new TextDecoder().decode(target[1]);}
    let parsed;
    if (String(upload.content_type) === "application/pdf" || effectiveName.toLowerCase().endsWith(".pdf")) parsed = await parsePdfWithGateway(bytes, effectiveName); else parsed = await parseHealthFile(text, String(upload.type), effectiveName);
    const statements: D1PreparedStatement[] = [];
    for (const observation of parsed.observations) statements.push(observationStatement(db, memberId, observation, now));
    for (const day of parsed.wearableDays) statements.push(db.prepare("INSERT INTO wearable_daily (id, member_id, provider, day, timezone, sleep_minutes, sleep_score, hrv_rmssd, resting_hr, steps, active_calories, workout_minutes, quality, raw_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(member_id, provider, day) DO UPDATE SET timezone=excluded.timezone, sleep_minutes=excluded.sleep_minutes, sleep_score=excluded.sleep_score, hrv_rmssd=excluded.hrv_rmssd, resting_hr=excluded.resting_hr, steps=excluded.steps, active_calories=excluded.active_calories, workout_minutes=excluded.workout_minutes, quality=excluded.quality, raw_hash=excluded.raw_hash")
      .bind(id("daily"), memberId, day.provider, day.day, day.timezone, day.sleepMinutes ?? null, day.sleepScore ?? null, day.hrvRmssd ?? null, day.restingHr ?? null, day.steps ?? null, day.activeCalories ?? null, day.workoutMinutes ?? null, day.quality, day.rawHash, now));
    if (statements.length) await db.batch(statements);
    const needsReview = parsed.observations.filter((item) => item.quality === "needs_review").length; const result = { observations: parsed.observations.length, wearableDays: parsed.wearableDays.length, needsReview };
    await db.batch([
      db.prepare("UPDATE processing_jobs SET status = ?, progress = 100, result_json = ?, updated_at = ? WHERE id = ?").bind(parsed.observations.length || parsed.wearableDays.length ? "completed" : "needs_review", JSON.stringify(result), nowIso(), jobId),
      db.prepare("UPDATE uploads SET status = ? WHERE id = ? AND member_id = ?").bind(parsed.observations.length || parsed.wearableDays.length ? "processed" : "needs_review", uploadId, memberId),
    ]);
    if (parsed.wearableDays.length) await syncWearableObservations(db, memberId, parsed.wearableDays, now);
    if (statements.length) await recomputeTwin(memberId);
    text = ""; return { id: jobId, status: parsed.observations.length || parsed.wearableDays.length ? "completed" : "needs_review", ...result };
  } catch (error) { const message = error instanceof Error ? error.message : "Processing failed"; await db.batch([db.prepare("UPDATE processing_jobs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?").bind(message, nowIso(), jobId), db.prepare("UPDATE uploads SET status = 'processing_failed' WHERE id = ? AND member_id = ?").bind(uploadId, memberId)]); return { id: jobId, status: "failed", error: message }; }
}

function observationStatement(db: D1Database, memberId: string, observation: ImportedObservation, now: string) { return db.prepare("INSERT INTO observations (id, member_id, concept_code, domain, value_number, value_text, unit, effective_at, source, quality, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id("obs"), memberId, observation.conceptCode, observation.domain, observation.valueNumber, observation.valueText ?? null, observation.unit ?? null, observation.effectiveAt, observation.source, observation.quality, JSON.stringify(observation.metadata ?? {}), now); }

async function parsePdfWithGateway(bytes: ArrayBuffer, fileName: string): Promise<{ observations: ImportedObservation[]; wearableDays: [] }> {
  const config = runtimeConfig(); if (!config.AI_GATEWAY_URL || bytes.byteLength > 8 * 1024 * 1024) return { observations: [], wearableDays: [] };
  const view=new Uint8Array(bytes);let binary="";for(let offset=0;offset<view.length;offset+=32768)binary+=String.fromCharCode(...view.subarray(offset,Math.min(offset+32768,view.length)));const base64=btoa(binary);binary=""; const response = await fetch(config.AI_GATEWAY_URL, { method: "POST", headers: { "Content-Type": "application/json", ...(config.AI_GATEWAY_TOKEN ? { Authorization: `Bearer ${config.AI_GATEWAY_TOKEN}` } : {}) }, body: JSON.stringify({ task: "extract_lab_results", fileName, fileBase64: base64, outputSchema: { observations: [{ conceptCode: "string", domain: "string", valueNumber: "number", unit: "string", effectiveAt: "ISO date", source: "string" }] } }) });
  if (!response.ok) return { observations: [], wearableDays: [] }; const value = await response.json() as { observations?: ImportedObservation[] }; return { observations: (value.observations ?? []).map((item) => ({ ...item, quality: "needs_review", metadata: { ...(item.metadata ?? {}), parser: "ai-pdf-v1" } })), wearableDays: [] };
}

async function syncWearableObservations(db: D1Database, memberId: string, days: Array<{ provider: string }>, now: string) {
  const provider = days[0]?.provider ?? "wearable"; const rows = await db.prepare("SELECT AVG(hrv_rmssd) hrv, AVG(resting_hr) rhr, AVG(sleep_minutes) sleep, AVG(steps) steps FROM wearable_daily WHERE member_id = ? AND day >= date('now','-28 day')").bind(memberId).first<{ hrv: number | null; rhr: number | null; sleep: number | null; steps: number | null }>();
  const metrics: Array<[string, string, number | null, string]> = [["hrv_rmssd_28d", "recovery", rows?.hrv ?? null, "ms"], ["resting_hr_28d", "recovery", rows?.rhr ?? null, "bpm"], ["sleep_duration_28d", "sleep", rows?.sleep ? rows.sleep / 60 : null, "hours"], ["daily_steps_28d", "activity", rows?.steps ?? null, "steps"]];
  const statements = metrics.filter(([, , value]) => value !== null).map(([concept, domain, value, unit]) => db.prepare("INSERT INTO observations (id, member_id, concept_code, domain, value_number, value_text, unit, effective_at, source, quality, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 'accepted', ?, ?)").bind(id("obs"), memberId, concept, domain, value, unit, now, provider === "apple_health" ? "Apple Health" : provider === "garmin" ? "Garmin" : provider, JSON.stringify({ window: "28d", aggregation: "mean" }), now));
  if (statements.length) await db.batch(statements);
}
