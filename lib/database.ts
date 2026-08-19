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
  `CREATE TABLE IF NOT EXISTS member_roles (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(member_id, role))`,
  `CREATE TABLE IF NOT EXISTS catalog_versions (id TEXT PRIMARY KEY, code TEXT NOT NULL, version INTEGER NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, amount_paise INTEGER NOT NULL, tax_paise INTEGER NOT NULL, city TEXT NOT NULL, turnaround_days INTEGER NOT NULL, preparation_json TEXT NOT NULL, cancellation_policy TEXT NOT NULL, active INTEGER NOT NULL, created_at TEXT NOT NULL, UNIQUE(code, version))`,
  `CREATE INDEX IF NOT EXISTS idx_catalog_active_type ON catalog_versions(active, type)`,
  `CREATE TABLE IF NOT EXISTS order_events (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, member_id TEXT NOT NULL, status TEXT NOT NULL, actor_id TEXT NOT NULL, source TEXT NOT NULL, public_message TEXT NOT NULL, internal_note TEXT NOT NULL, occurred_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_order_events_order_time ON order_events(order_id, occurred_at)`,
  `CREATE INDEX IF NOT EXISTS idx_order_events_member_time ON order_events(member_id, occurred_at)`,
  `CREATE TABLE IF NOT EXISTS payment_attempts (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, member_id TEXT NOT NULL, provider TEXT NOT NULL, provider_order_id TEXT, provider_payment_id TEXT, amount_paise INTEGER NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL, idempotency_key TEXT NOT NULL, detail_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(member_id, idempotency_key))`,
  `CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON payment_attempts(provider_order_id)`,
  `CREATE TABLE IF NOT EXISTS consent_records (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, purpose TEXT NOT NULL, notice_version TEXT NOT NULL, granted INTEGER NOT NULL, evidence_json TEXT NOT NULL, granted_at TEXT, revoked_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_consents_member_purpose ON consent_records(member_id, purpose)`,
  `CREATE TABLE IF NOT EXISTS wearable_connections (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, external_user_id TEXT, encrypted_token_json TEXT, scopes_json TEXT NOT NULL, cursor TEXT, last_sync_at TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(member_id, provider))`,
  `CREATE INDEX IF NOT EXISTS idx_connections_status_sync ON wearable_connections(status, last_sync_at)`,
  `CREATE TABLE IF NOT EXISTS oauth_states (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, provider TEXT NOT NULL, verifier TEXT NOT NULL, redirect_uri TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_oauth_states_member_provider ON oauth_states(member_id, provider)`,
  `CREATE TABLE IF NOT EXISTS wearable_daily (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, provider TEXT NOT NULL, day TEXT NOT NULL, timezone TEXT NOT NULL, sleep_minutes REAL, sleep_score REAL, hrv_rmssd REAL, resting_hr REAL, steps REAL, active_calories REAL, workout_minutes REAL, quality REAL NOT NULL, raw_hash TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(member_id, provider, day))`,
  `CREATE INDEX IF NOT EXISTS idx_wearable_daily_member_day ON wearable_daily(member_id, day)`,
  `CREATE TABLE IF NOT EXISTS observation_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, observation_id TEXT NOT NULL, member_id TEXT NOT NULL, status TEXT NOT NULL, reviewer_id TEXT NOT NULL, previous_json TEXT NOT NULL, note TEXT NOT NULL, reviewed_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_observation_reviews_observation ON observation_reviews(observation_id)`,
  `CREATE TABLE IF NOT EXISTS processing_jobs (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, upload_id TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, progress INTEGER NOT NULL, result_json TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_member_status ON processing_jobs(member_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_upload ON processing_jobs(upload_id)`,
  `CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, reviewer_id TEXT, note TEXT NOT NULL, created_at TEXT NOT NULL, decided_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_entity ON approvals(entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_status_role ON approvals(status, role)`,
  `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, channel TEXT NOT NULL, template TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL, sent_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_member_created ON notifications(member_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`,
  `CREATE TABLE IF NOT EXISTS daily_adjustments (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, protocol_id TEXT NOT NULL, day TEXT NOT NULL, knob TEXT NOT NULL, previous_value TEXT NOT NULL, adjusted_value TEXT NOT NULL, rationale TEXT NOT NULL, twin_snapshot_id TEXT NOT NULL, accepted INTEGER NOT NULL, created_at TEXT NOT NULL, UNIQUE(member_id, day))`,
  `CREATE TABLE IF NOT EXISTS chat_audits (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, message_id TEXT NOT NULL, snapshot_hash TEXT NOT NULL, fields_json TEXT NOT NULL, grounding_json TEXT NOT NULL, model TEXT NOT NULL, policy_version TEXT NOT NULL, safety_class TEXT NOT NULL, outcome TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(message_id))`,
  `CREATE INDEX IF NOT EXISTS idx_chat_audits_member_time ON chat_audits(member_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS genomic_artifacts (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, upload_id TEXT, kind TEXT NOT NULL, format TEXT NOT NULL, genome_build TEXT, sample_id TEXT, object_key TEXT NOT NULL, checksum_sha256 TEXT NOT NULL, size INTEGER NOT NULL, status TEXT NOT NULL, qc_json TEXT NOT NULL, pipeline_version TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_genomic_artifacts_member_created ON genomic_artifacts(member_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_genomic_artifacts_status ON genomic_artifacts(status)`,
  `CREATE TABLE IF NOT EXISTS genomic_variant_calls (id TEXT PRIMARY KEY, artifact_id TEXT NOT NULL, member_id TEXT NOT NULL, rsid TEXT, chromosome TEXT NOT NULL, position INTEGER NOT NULL, reference_allele TEXT, alternate_allele TEXT, genotype TEXT, phased INTEGER NOT NULL, call_state TEXT NOT NULL, filter TEXT, quality REAL, metadata_json TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_variant_calls_artifact ON genomic_variant_calls(artifact_id)`,
  `CREATE INDEX IF NOT EXISTS idx_variant_calls_member_rsid ON genomic_variant_calls(member_id, rsid)`,
  `CREATE INDEX IF NOT EXISTS idx_variant_calls_member_position ON genomic_variant_calls(member_id, chromosome, position)`,
  `CREATE TABLE IF NOT EXISTS evidence_releases (id TEXT PRIMARY KEY, source TEXT NOT NULL, version TEXT NOT NULL, released_at TEXT NOT NULL, checksum TEXT NOT NULL, status TEXT NOT NULL, metadata_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(source, version))`,
  `CREATE TABLE IF NOT EXISTS genomic_interpretations (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, artifact_id TEXT NOT NULL, variant_call_id TEXT, gene TEXT NOT NULL, rsid TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, evidence_level TEXT NOT NULL, evidence_release_ids_json TEXT NOT NULL, limitations_json TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_interpretations_member_status ON genomic_interpretations(member_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_interpretations_artifact ON genomic_interpretations(artifact_id)`,
  `CREATE TABLE IF NOT EXISTS genomic_reanalysis_runs (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, artifact_id TEXT NOT NULL, previous_run_id TEXT, trigger TEXT NOT NULL, evidence_set_json TEXT NOT NULL, pipeline_version TEXT NOT NULL, status TEXT NOT NULL, summary_json TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_reanalysis_member_created ON genomic_reanalysis_runs(member_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_reanalysis_artifact ON genomic_reanalysis_runs(artifact_id)`,
  `CREATE TABLE IF NOT EXISTS cross_modal_findings (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, snapshot_id TEXT NOT NULL, domain_code TEXT NOT NULL, title TEXT NOT NULL, statement TEXT NOT NULL, direction TEXT NOT NULL, confidence REAL NOT NULL, layers_json TEXT NOT NULL, evidence_refs_json TEXT NOT NULL, missing_json TEXT NOT NULL, method_version TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(snapshot_id, domain_code, title))`,
  `CREATE INDEX IF NOT EXISTS idx_cross_modal_member_snapshot ON cross_modal_findings(member_id, snapshot_id)`,
  `CREATE TABLE IF NOT EXISTS ai_draft_runs (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, task TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, input_hash TEXT NOT NULL, input_refs_json TEXT NOT NULL, model TEXT NOT NULL, prompt_version TEXT NOT NULL, policy_version TEXT NOT NULL, output_json TEXT NOT NULL, status TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_drafts_member_created ON ai_draft_runs(member_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_drafts_entity ON ai_draft_runs(entity_type, entity_id)`,
  `CREATE TABLE IF NOT EXISTS chat_reviews (id TEXT PRIMARY KEY, audit_id TEXT NOT NULL UNIQUE, member_id TEXT NOT NULL, reviewer_id TEXT NOT NULL, verdict TEXT NOT NULL, correction TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_reviews_member_created ON chat_reviews(member_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS lab_integration_events (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, order_id TEXT, provider TEXT NOT NULL, external_reference TEXT, event_type TEXT NOT NULL, idempotency_key TEXT NOT NULL, status TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, processed_at TEXT, UNIQUE(provider, idempotency_key))`,
  `CREATE INDEX IF NOT EXISTS idx_lab_events_member_created ON lab_integration_events(member_id, created_at)`,
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
