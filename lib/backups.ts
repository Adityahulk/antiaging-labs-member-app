import { env } from "cloudflare:workers";
import { getDatabase, id, nowIso, parseJson } from "./database";

type BackupEnvelope = { format: "antiaging-labs-d1-backup-v1"; createdAt: string; tables: Record<string, Array<Record<string, unknown>>> };
type BackupEnv = { UPLOADS?: R2Bucket };

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateBackupEnvelope(value: unknown) {
  if (!value || typeof value !== "object") return { valid: false, tableCount: 0, rowCount: 0 };
  const envelope = value as Partial<BackupEnvelope>;
  if (envelope.format !== "antiaging-labs-d1-backup-v1" || !envelope.tables || typeof envelope.tables !== "object") return { valid: false, tableCount: 0, rowCount: 0 };
  const entries = Object.entries(envelope.tables);
  if (entries.some(([name, rows]) => !/^[a-z][a-z0-9_]*$/.test(name) || !Array.isArray(rows))) return { valid: false, tableCount: 0, rowCount: 0 };
  return { valid: true, tableCount: entries.length, rowCount: entries.reduce((total, [, rows]) => total + rows.length, 0) };
}

async function userTables(db: D1Database) {
  const rows = await db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all<{ name: string }>();
  return rows.results.map((row) => row.name).filter((name) => /^[a-z][a-z0-9_]*$/.test(name));
}

export async function createDatabaseBackup(triggeredBy: string) {
  const bucket = (env as unknown as BackupEnv).UPLOADS;
  if (!bucket) throw new Error("Backup storage is unavailable");
  const db = await getDatabase(); const backupId = id("backup"); const createdAt = nowIso();
  const objectKey = `system-backups/d1/${createdAt.slice(0, 10)}/${backupId}.json`;
  await db.prepare("INSERT INTO backup_runs (id,object_key,status,table_count,row_count,bytes,checksum_sha256,triggered_by,created_at,verified_at,error) VALUES (?,?,'creating',0,0,0,'',?,?,NULL,NULL)").bind(backupId, objectKey, triggeredBy, createdAt).run();
  try {
    const tables: BackupEnvelope["tables"] = {};
    for (const table of await userTables(db)) {
      const rows: Array<Record<string, unknown>> = [];
      for (let offset = 0; ; offset += 500) {
        const page = await db.prepare(`SELECT * FROM "${table}" LIMIT 500 OFFSET ?`).bind(offset).all<Record<string, unknown>>();
        rows.push(...page.results); if (page.results.length < 500) break;
      }
      tables[table] = rows;
    }
    const envelope: BackupEnvelope = { format: "antiaging-labs-d1-backup-v1", createdAt, tables };
    const bytes = new TextEncoder().encode(JSON.stringify(envelope)); const checksum = await sha256(bytes);
    const counts = validateBackupEnvelope(envelope);
    await bucket.put(objectKey, bytes, { httpMetadata: { contentType: "application/json" }, customMetadata: { checksum, format: envelope.format, createdAt } });
    await db.prepare("UPDATE backup_runs SET status='stored',table_count=?,row_count=?,bytes=?,checksum_sha256=? WHERE id=?").bind(counts.tableCount, counts.rowCount, bytes.byteLength, checksum, backupId).run();
    return verifyDatabaseBackup(backupId);
  } catch (caught) {
    const error = caught instanceof Error ? caught.message.slice(0, 500) : "Backup failed";
    await db.prepare("UPDATE backup_runs SET status='failed',error=? WHERE id=?").bind(error, backupId).run();
    throw new Error(error);
  }
}

export async function verifyDatabaseBackup(backupId: string) {
  const bucket = (env as unknown as BackupEnv).UPLOADS; if (!bucket) throw new Error("Backup storage is unavailable");
  const db = await getDatabase(); const run = await db.prepare("SELECT * FROM backup_runs WHERE id=?").bind(backupId).first<Record<string, unknown>>();
  if (!run) throw new Error("Backup not found"); const object = await bucket.get(String(run.object_key)); if (!object) throw new Error("Backup object is missing");
  const bytes = new Uint8Array(await object.arrayBuffer()); const checksum = await sha256(bytes); const envelope = parseJson<unknown>(new TextDecoder().decode(bytes), null); const counts = validateBackupEnvelope(envelope);
  if (!counts.valid || checksum !== run.checksum_sha256 || counts.tableCount !== Number(run.table_count) || counts.rowCount !== Number(run.row_count)) {
    await db.prepare("UPDATE backup_runs SET status='verification_failed',error='Checksum or manifest mismatch' WHERE id=?").bind(backupId).run();
    throw new Error("Backup verification failed");
  }
  const verifiedAt = nowIso(); await db.prepare("UPDATE backup_runs SET status='verified',verified_at=?,error=NULL WHERE id=?").bind(verifiedAt, backupId).run();
  return { id: backupId, status: "verified", objectKey: run.object_key, tableCount: counts.tableCount, rowCount: counts.rowCount, bytes: bytes.byteLength, checksum, createdAt: run.created_at, verifiedAt };
}

export async function listDatabaseBackups() {
  const db = await getDatabase(); const rows = await db.prepare("SELECT id,status,table_count,row_count,bytes,triggered_by,created_at,verified_at,error FROM backup_runs ORDER BY created_at DESC LIMIT 20").all<Record<string, unknown>>();
  return rows.results;
}

export async function maybeCreateScheduledBackup() {
  const db = await getDatabase(); const recent = await db.prepare("SELECT id FROM backup_runs WHERE status='verified' AND created_at >= datetime('now','-6 day') ORDER BY created_at DESC LIMIT 1").first<{ id: string }>();
  if (recent) return { skipped: true, reason: "recent_verified_backup", id: recent.id };
  return createDatabaseBackup("scheduled");
}
