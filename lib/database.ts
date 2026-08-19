import { env } from "cloudflare:workers";

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, primary_goal TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS journey_steps (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id TEXT NOT NULL, step_code TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL, state TEXT NOT NULL, sort_order INTEGER NOT NULL, due_at TEXT, updated_at TEXT NOT NULL, UNIQUE(member_id, step_code))`,
  `CREATE INDEX IF NOT EXISTS idx_journey_member_order ON journey_steps(member_id, sort_order)`,
  `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, type TEXT NOT NULL, product_name TEXT NOT NULL, status TEXT NOT NULL, reference TEXT NOT NULL, vendor TEXT, amount_paise INTEGER NOT NULL, payment_status TEXT NOT NULL, tracking_url TEXT, appointment_at TEXT, metadata_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_member_updated ON orders(member_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
  `CREATE TABLE IF NOT EXISTS intake_answers (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id TEXT NOT NULL, question_code TEXT NOT NULL, module TEXT NOT NULL, answer_json TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(member_id, question_code))`,
  `CREATE INDEX IF NOT EXISTS idx_intake_member_module ON intake_answers(member_id, module)`,
  `CREATE TABLE IF NOT EXISTS data_sources (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, source_code TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, status TEXT NOT NULL, last_sync_at TEXT, coverage REAL NOT NULL, metadata_json TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(member_id, source_code))`,
  `CREATE INDEX IF NOT EXISTS idx_sources_member_status ON data_sources(member_id, status)`,
  `CREATE TABLE IF NOT EXISTS observations (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, concept_code TEXT NOT NULL, domain TEXT NOT NULL, value_number REAL, value_text TEXT, unit TEXT, effective_at TEXT NOT NULL, source TEXT NOT NULL, quality TEXT NOT NULL, metadata_json TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_observations_member_domain_time ON observations(member_id, domain, effective_at)`,
  `CREATE INDEX IF NOT EXISTS idx_observations_member_concept_time ON observations(member_id, concept_code, effective_at)`,
  `CREATE TABLE IF NOT EXISTS twin_snapshots (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, version INTEGER NOT NULL, as_of TEXT NOT NULL, coverage REAL NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(member_id, version))`,
  `CREATE INDEX IF NOT EXISTS idx_twin_member_asof ON twin_snapshots(member_id, as_of)`,
  `CREATE TABLE IF NOT EXISTS twin_domains (id INTEGER PRIMARY KEY AUTOINCREMENT, snapshot_id TEXT NOT NULL, member_id TEXT NOT NULL, domain_code TEXT NOT NULL, label TEXT NOT NULL, status TEXT NOT NULL, state_label TEXT NOT NULL, trend TEXT NOT NULL, confidence REAL NOT NULL, freshness TEXT NOT NULL, key_metric TEXT NOT NULL, key_value TEXT NOT NULL, key_unit TEXT, target TEXT, evidence_json TEXT NOT NULL, UNIQUE(snapshot_id, domain_code))`,
  `CREATE INDEX IF NOT EXISTS idx_twin_domains_member ON twin_domains(member_id)`,
  `CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, source_date TEXT, overview TEXT NOT NULL, deep_dive_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_reports_member_updated ON reports(member_id, updated_at)`,
  `CREATE TABLE IF NOT EXISTS protocol_versions (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL, title TEXT NOT NULL, strategy TEXT NOT NULL, started_at TEXT NOT NULL, ends_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(member_id, version))`,
  `CREATE INDEX IF NOT EXISTS idx_protocol_member_status ON protocol_versions(member_id, status)`,
  `CREATE TABLE IF NOT EXISTS protocol_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, protocol_id TEXT NOT NULL, member_id TEXT NOT NULL, domain TEXT NOT NULL, day_of_week INTEGER NOT NULL, scheduled_time TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL, reason TEXT NOT NULL, target TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, done_at TEXT, sort_order INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_actions_member_protocol_order ON protocol_actions(member_id, protocol_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_actions_member_done ON protocol_actions(member_id, done)`,
  `CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, sources_json TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_member_conversation_time ON chat_messages(member_id, conversation_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, type TEXT NOT NULL, object_key TEXT NOT NULL, file_name TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_uploads_member_created ON uploads(member_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, provider TEXT NOT NULL, event_type TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL, received_at TEXT NOT NULL, processed_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_webhooks_provider_status ON webhook_events(provider, status)`,
  `CREATE TABLE IF NOT EXISTS admin_events (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id TEXT, actor_id TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, detail_json TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_admin_events_created ON admin_events(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_admin_events_member ON admin_events(member_id)`,
];

let initialized = false;

export async function getDatabase(): Promise<D1Database> {
  const database = env.DB;
  if (!database) throw new Error("Database binding DB is unavailable");
  if (!initialized) {
    await database.batch(schemaStatements.map((statement) => database.prepare(statement)));
    await database.prepare("PRAGMA optimize").run();
    initialized = true;
  }
  return database;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
