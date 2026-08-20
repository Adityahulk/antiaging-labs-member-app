import { env } from "cloudflare:workers";
import { getDatabase, id, nowIso } from "./database";
import { parseHealthFile, type ImportedObservation } from "./importers";
import { recomputeTwin } from "./twin-engine";
import { unzipSync } from "fflate";
import { ingestGenomicArtifact } from "./genomics";
import { aiGatewayStatus, runAI } from "./ai-gateway";

type UploadEnv = { UPLOADS?: R2Bucket };

export async function processUpload(memberId: string, uploadId: string) {
  const db = await getDatabase(); const now = nowIso(); const upload = await db.prepare("SELECT * FROM uploads WHERE id = ? AND member_id = ?").bind(uploadId, memberId).first<Record<string, unknown>>(); if (!upload) throw new Error("Upload not found");
  const jobId = id("job"); await db.prepare("INSERT INTO processing_jobs (id, member_id, upload_id, type, status, progress, result_json, error, created_at, updated_at) VALUES (?, ?, ?, ?, 'processing', 10, '{}', NULL, ?, ?)").bind(jobId, memberId, uploadId, upload.type, now, now).run();
  try {
    const bucket = (env as unknown as UploadEnv).UPLOADS; if (!bucket) throw new Error("Upload storage unavailable"); const object = await bucket.get(String(upload.object_key)); if (!object) throw new Error("Stored file missing");
    const bytes = await object.arrayBuffer(); let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes); let effectiveName=String(upload.file_name);
    if (String(upload.type) === "genetics") {
      const genomic = await ingestGenomicArtifact({ memberId, uploadId, objectKey: String(upload.object_key), fileName: effectiveName, size: Number(upload.size), bytes });
      const result = { observations: 0, wearableDays: 0, needsReview: genomic.status === "needs_review" ? 1 : 0, genomic };
      await db.batch([
        db.prepare("UPDATE processing_jobs SET status = ?, progress = 100, result_json = ?, updated_at = ? WHERE id = ?").bind(genomic.status === "needs_review" ? "needs_review" : "completed", JSON.stringify(result), nowIso(), jobId),
        db.prepare("UPDATE uploads SET status = ? WHERE id = ? AND member_id = ?").bind(genomic.status === "needs_review" ? "needs_review" : "processed", uploadId, memberId),
      ]);
      await recomputeTwin(memberId); text = ""; return { id: jobId, status: genomic.status === "needs_review" ? "needs_review" : "completed", ...result };
    }
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
  if (!aiGatewayStatus().ready || bytes.byteLength > 8 * 1024 * 1024) return { observations: [], wearableDays: [] };
  const view=new Uint8Array(bytes);let binary="";for(let offset=0;offset<view.length;offset+=32768)binary+=String.fromCharCode(...view.subarray(offset,Math.min(offset+32768,view.length)));const base64=btoa(binary);binary="";
  const schema={type:"object",additionalProperties:false,properties:{observations:{type:"array",maxItems:500,items:{type:"object",additionalProperties:false,properties:{conceptCode:{type:"string"},domain:{type:"string"},valueNumber:{type:["number","null"]},valueText:{type:["string","null"]},unit:{type:["string","null"]},effectiveAt:{type:"string"},source:{type:"string"}},required:["conceptCode","domain","valueNumber","valueText","unit","effectiveAt","source"]}}},required:["observations"]} as const;
  try {
    const result=await runAI<{observations?:unknown}>({task:"extract_lab_results",modelClass:"vision",schema,schemaName:"lab_pdf_observations",maxOutputTokens:7000,file:{filename:fileName,mimeType:"application/pdf",dataBase64:base64},input:"Extract every clearly reported laboratory observation from this PDF. Preserve the printed value, unit, collection/result date, and source laboratory. Use stable lowercase snake_case concept codes. Do not infer missing values or convert units.",instructions:"You are a structured laboratory-document extractor. Extract only facts explicitly printed in the supplied document. Never diagnose, recommend, infer an unreported value, or silently normalize a unit. Return only the requested structured object."});
    const rows=Array.isArray(result.data.observations)?result.data.observations:[];
    const observations=rows.flatMap((raw):ImportedObservation[]=>{if(!raw||typeof raw!=="object")return[];const item=raw as Record<string,unknown>;const conceptCode=typeof item.conceptCode==="string"?item.conceptCode.trim().toLowerCase():"";const domain=typeof item.domain==="string"?item.domain.trim().toLowerCase():"";const valueNumber=typeof item.valueNumber==="number"&&Number.isFinite(item.valueNumber)?item.valueNumber:null;const valueText=typeof item.valueText==="string"?item.valueText.trim():undefined;if(!/^[a-z0-9_:-]{2,80}$/.test(conceptCode)||!domain||valueNumber===null&&!valueText)return[];const effectiveAt=typeof item.effectiveAt==="string"&&!Number.isNaN(Date.parse(item.effectiveAt))?new Date(item.effectiveAt).toISOString():nowIso();return[{conceptCode,domain,valueNumber,valueText,unit:typeof item.unit==="string"?item.unit.trim():undefined,effectiveAt,source:typeof item.source==="string"&&item.source.trim()?item.source.trim():"Uploaded laboratory PDF",quality:"needs_review",metadata:{parser:"ai-pdf-v2",model:result.model,requestId:result.requestId,originalFile:fileName}}];});
    return {observations,wearableDays:[]};
  } catch { return { observations: [], wearableDays: [] }; }
}

async function syncWearableObservations(db: D1Database, memberId: string, days: Array<{ provider: string }>, now: string) {
  const provider = days[0]?.provider ?? "wearable"; const rows = await db.prepare("SELECT AVG(hrv_rmssd) hrv, AVG(resting_hr) rhr, AVG(sleep_minutes) sleep, AVG(steps) steps FROM wearable_daily WHERE member_id = ? AND day >= date('now','-28 day')").bind(memberId).first<{ hrv: number | null; rhr: number | null; sleep: number | null; steps: number | null }>();
  const metrics: Array<[string, string, number | null, string]> = [["hrv_rmssd_28d", "recovery", rows?.hrv ?? null, "ms"], ["resting_hr_28d", "recovery", rows?.rhr ?? null, "bpm"], ["sleep_duration_28d", "sleep", rows?.sleep ? rows.sleep / 60 : null, "hours"], ["daily_steps_28d", "activity", rows?.steps ?? null, "steps"]];
  const statements = metrics.filter(([, , value]) => value !== null).map(([concept, domain, value, unit]) => db.prepare("INSERT INTO observations (id, member_id, concept_code, domain, value_number, value_text, unit, effective_at, source, quality, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 'accepted', ?, ?)").bind(id("obs"), memberId, concept, domain, value, unit, now, provider === "apple_health" ? "Apple Health" : provider === "garmin" ? "Garmin" : provider, JSON.stringify({ window: "28d", aggregation: "mean" }), now));
  if (statements.length) await db.batch(statements);
}
