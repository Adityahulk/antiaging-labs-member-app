import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  primaryGoal: text("primary_goal").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_members_email").on(table.email)]);

export const journeySteps = sqliteTable("journey_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull(),
  stepCode: text("step_code").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  state: text("state").notNull(),
  sortOrder: integer("sort_order").notNull(),
  dueAt: text("due_at"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_journey_member_step").on(table.memberId, table.stepCode), index("idx_journey_member_order").on(table.memberId, table.sortOrder)]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  type: text("type").notNull(),
  productName: text("product_name").notNull(),
  status: text("status").notNull(),
  reference: text("reference").notNull(),
  vendor: text("vendor"),
  amountPaise: integer("amount_paise").notNull(),
  paymentStatus: text("payment_status").notNull(),
  trackingUrl: text("tracking_url"),
  appointmentAt: text("appointment_at"),
  metadataJson: text("metadata_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_orders_member_updated").on(table.memberId, table.updatedAt), index("idx_orders_status").on(table.status)]);

export const intakeAnswers = sqliteTable("intake_answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull(),
  questionCode: text("question_code").notNull(),
  module: text("module").notNull(),
  answerJson: text("answer_json").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_intake_member_question").on(table.memberId, table.questionCode), index("idx_intake_member_module").on(table.memberId, table.module)]);

export const dataSources = sqliteTable("data_sources", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  sourceCode: text("source_code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  lastSyncAt: text("last_sync_at"),
  coverage: real("coverage").notNull(),
  metadataJson: text("metadata_json").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_sources_member_code").on(table.memberId, table.sourceCode), index("idx_sources_member_status").on(table.memberId, table.status)]);

export const observations = sqliteTable("observations", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  conceptCode: text("concept_code").notNull(),
  domain: text("domain").notNull(),
  valueNumber: real("value_number"),
  valueText: text("value_text"),
  unit: text("unit"),
  effectiveAt: text("effective_at").notNull(),
  source: text("source").notNull(),
  quality: text("quality").notNull(),
  metadataJson: text("metadata_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_observations_member_domain_time").on(table.memberId, table.domain, table.effectiveAt), index("idx_observations_member_concept_time").on(table.memberId, table.conceptCode, table.effectiveAt)]);

export const twinSnapshots = sqliteTable("twin_snapshots", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  version: integer("version").notNull(),
  asOf: text("as_of").notNull(),
  coverage: real("coverage").notNull(),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_twin_member_version").on(table.memberId, table.version), index("idx_twin_member_asof").on(table.memberId, table.asOf)]);

export const twinDomains = sqliteTable("twin_domains", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  snapshotId: text("snapshot_id").notNull(),
  memberId: text("member_id").notNull(),
  domainCode: text("domain_code").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull(),
  stateLabel: text("state_label").notNull(),
  trend: text("trend").notNull(),
  confidence: real("confidence").notNull(),
  freshness: text("freshness").notNull(),
  keyMetric: text("key_metric").notNull(),
  keyValue: text("key_value").notNull(),
  keyUnit: text("key_unit"),
  target: text("target"),
  evidenceJson: text("evidence_json").notNull(),
}, (table) => [uniqueIndex("idx_twin_domains_snapshot_code").on(table.snapshotId, table.domainCode), index("idx_twin_domains_member").on(table.memberId)]);

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  sourceDate: text("source_date"),
  overview: text("overview").notNull(),
  deepDiveJson: text("deep_dive_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_reports_member_updated").on(table.memberId, table.updatedAt)]);

export const protocolVersions = sqliteTable("protocol_versions", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  version: integer("version").notNull(),
  status: text("status").notNull(),
  title: text("title").notNull(),
  strategy: text("strategy").notNull(),
  startedAt: text("started_at").notNull(),
  endsAt: text("ends_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_protocol_member_version").on(table.memberId, table.version), index("idx_protocol_member_status").on(table.memberId, table.status)]);

export const protocolActions = sqliteTable("protocol_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  protocolId: text("protocol_id").notNull(),
  memberId: text("member_id").notNull(),
  domain: text("domain").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  reason: text("reason").notNull(),
  target: text("target").notNull(),
  done: integer("done", { mode: "boolean" }).notNull(),
  doneAt: text("done_at"),
  sortOrder: integer("sort_order").notNull(),
}, (table) => [index("idx_actions_member_protocol_order").on(table.memberId, table.protocolId, table.sortOrder), index("idx_actions_member_done").on(table.memberId, table.done)]);

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  conversationId: text("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  sourcesJson: text("sources_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_chat_member_conversation_time").on(table.memberId, table.conversationId, table.createdAt)]);

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  type: text("type").notNull(),
  objectKey: text("object_key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_uploads_member_created").on(table.memberId, table.createdAt)]);

export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull(),
  receivedAt: text("received_at").notNull(),
  processedAt: text("processed_at"),
}, (table) => [index("idx_webhooks_provider_status").on(table.provider, table.status)]);

export const adminEvents = sqliteTable("admin_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id"),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detailJson: text("detail_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_admin_events_created").on(table.createdAt), index("idx_admin_events_member").on(table.memberId)]);

export const memberRoles = sqliteTable("member_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }), memberId: text("member_id").notNull(), role: text("role").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_member_roles_member_role").on(table.memberId, table.role)]);

export const catalogVersions = sqliteTable("catalog_versions", {
  id: text("id").primaryKey(), code: text("code").notNull(), version: integer("version").notNull(), type: text("type").notNull(), name: text("name").notNull(), description: text("description").notNull(), amountPaise: integer("amount_paise").notNull(), taxPaise: integer("tax_paise").notNull(), city: text("city").notNull(), turnaroundDays: integer("turnaround_days").notNull(), preparationJson: text("preparation_json").notNull(), cancellationPolicy: text("cancellation_policy").notNull(), active: integer("active", { mode: "boolean" }).notNull(), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_catalog_code_version").on(table.code, table.version), index("idx_catalog_active_type").on(table.active, table.type)]);

export const orderEvents = sqliteTable("order_events", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull(), memberId: text("member_id").notNull(), status: text("status").notNull(), actorId: text("actor_id").notNull(), source: text("source").notNull(), publicMessage: text("public_message").notNull(), internalNote: text("internal_note").notNull(), occurredAt: text("occurred_at").notNull(),
}, (table) => [index("idx_order_events_order_time").on(table.orderId, table.occurredAt), index("idx_order_events_member_time").on(table.memberId, table.occurredAt)]);

export const paymentAttempts = sqliteTable("payment_attempts", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull(), memberId: text("member_id").notNull(), provider: text("provider").notNull(), providerOrderId: text("provider_order_id"), providerPaymentId: text("provider_payment_id"), amountPaise: integer("amount_paise").notNull(), currency: text("currency").notNull(), status: text("status").notNull(), idempotencyKey: text("idempotency_key").notNull(), detailJson: text("detail_json").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_payments_idempotency").on(table.memberId, table.idempotencyKey), index("idx_payments_provider_order").on(table.providerOrderId)]);

export const consentRecords = sqliteTable("consent_records", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), purpose: text("purpose").notNull(), noticeVersion: text("notice_version").notNull(), granted: integer("granted", { mode: "boolean" }).notNull(), evidenceJson: text("evidence_json").notNull(), grantedAt: text("granted_at"), revokedAt: text("revoked_at"), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_consents_member_purpose").on(table.memberId, table.purpose)]);

export const wearableConnections = sqliteTable("wearable_connections", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), provider: text("provider").notNull(), status: text("status").notNull(), externalUserId: text("external_user_id"), encryptedTokenJson: text("encrypted_token_json"), scopesJson: text("scopes_json").notNull(), cursor: text("cursor"), lastSyncAt: text("last_sync_at"), error: text("error"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_connections_member_provider").on(table.memberId, table.provider), index("idx_connections_status_sync").on(table.status, table.lastSyncAt)]);

export const oauthStates = sqliteTable("oauth_states", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), provider: text("provider").notNull(), verifier: text("verifier").notNull(), redirectUri: text("redirect_uri").notNull(), expiresAt: text("expires_at").notNull(), consumedAt: text("consumed_at"), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_oauth_states_member_provider").on(table.memberId, table.provider)]);

export const wearableDaily = sqliteTable("wearable_daily", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), provider: text("provider").notNull(), day: text("day").notNull(), timezone: text("timezone").notNull(), sleepMinutes: real("sleep_minutes"), sleepScore: real("sleep_score"), hrvRmssd: real("hrv_rmssd"), restingHr: real("resting_hr"), steps: real("steps"), activeCalories: real("active_calories"), workoutMinutes: real("workout_minutes"), quality: real("quality").notNull(), rawHash: text("raw_hash").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_wearable_daily_member_provider_day").on(table.memberId, table.provider, table.day), index("idx_wearable_daily_member_day").on(table.memberId, table.day)]);

export const observationReviews = sqliteTable("observation_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }), observationId: text("observation_id").notNull(), memberId: text("member_id").notNull(), status: text("status").notNull(), reviewerId: text("reviewer_id").notNull(), previousJson: text("previous_json").notNull(), note: text("note").notNull(), reviewedAt: text("reviewed_at").notNull(),
}, (table) => [index("idx_observation_reviews_observation").on(table.observationId)]);

export const processingJobs = sqliteTable("processing_jobs", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), uploadId: text("upload_id").notNull(), type: text("type").notNull(), status: text("status").notNull(), progress: integer("progress").notNull(), resultJson: text("result_json").notNull(), error: text("error"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_jobs_member_status").on(table.memberId, table.status), index("idx_jobs_upload").on(table.uploadId)]);

export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), role: text("role").notNull(), status: text("status").notNull(), reviewerId: text("reviewer_id"), note: text("note").notNull(), createdAt: text("created_at").notNull(), decidedAt: text("decided_at"),
}, (table) => [index("idx_approvals_entity").on(table.entityType, table.entityId), index("idx_approvals_status_role").on(table.status, table.role)]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), channel: text("channel").notNull(), template: text("template").notNull(), title: text("title").notNull(), body: text("body").notNull(), status: text("status").notNull(), readAt: text("read_at"), createdAt: text("created_at").notNull(), sentAt: text("sent_at"),
}, (table) => [index("idx_notifications_member_created").on(table.memberId, table.createdAt), index("idx_notifications_status").on(table.status)]);

export const dailyAdjustments = sqliteTable("daily_adjustments", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), protocolId: text("protocol_id").notNull(), day: text("day").notNull(), knob: text("knob").notNull(), previousValue: text("previous_value").notNull(), adjustedValue: text("adjusted_value").notNull(), rationale: text("rationale").notNull(), twinSnapshotId: text("twin_snapshot_id").notNull(), accepted: integer("accepted", { mode: "boolean" }).notNull(), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_adjustments_member_day").on(table.memberId, table.day)]);

export const chatAudits = sqliteTable("chat_audits", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), messageId: text("message_id").notNull(), snapshotHash: text("snapshot_hash").notNull(), fieldsJson: text("fields_json").notNull(), groundingJson: text("grounding_json").notNull(), model: text("model").notNull(), policyVersion: text("policy_version").notNull(), safetyClass: text("safety_class").notNull(), outcome: text("outcome").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_chat_audits_member_time").on(table.memberId, table.createdAt), uniqueIndex("idx_chat_audits_message").on(table.messageId)]);

export const genomicArtifacts = sqliteTable("genomic_artifacts", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), uploadId: text("upload_id"), kind: text("kind").notNull(), format: text("format").notNull(), genomeBuild: text("genome_build"), sampleId: text("sample_id"), objectKey: text("object_key").notNull(), checksumSha256: text("checksum_sha256").notNull(), size: integer("size").notNull(), status: text("status").notNull(), qcJson: text("qc_json").notNull(), pipelineVersion: text("pipeline_version").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_genomic_artifacts_member_created").on(table.memberId, table.createdAt), index("idx_genomic_artifacts_status").on(table.status)]);

export const genomicVariantCalls = sqliteTable("genomic_variant_calls", {
  id: text("id").primaryKey(), artifactId: text("artifact_id").notNull(), memberId: text("member_id").notNull(), rsid: text("rsid"), chromosome: text("chromosome").notNull(), position: integer("position").notNull(), referenceAllele: text("reference_allele"), alternateAllele: text("alternate_allele"), genotype: text("genotype"), phased: integer("phased", { mode: "boolean" }).notNull(), callState: text("call_state").notNull(), filter: text("filter"), quality: real("quality"), metadataJson: text("metadata_json").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_variant_calls_artifact").on(table.artifactId), index("idx_variant_calls_member_rsid").on(table.memberId, table.rsid), index("idx_variant_calls_member_position").on(table.memberId, table.chromosome, table.position)]);

export const evidenceReleases = sqliteTable("evidence_releases", {
  id: text("id").primaryKey(), source: text("source").notNull(), version: text("version").notNull(), releasedAt: text("released_at").notNull(), checksum: text("checksum").notNull(), status: text("status").notNull(), metadataJson: text("metadata_json").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_evidence_source_version").on(table.source, table.version)]);

export const genomicInterpretations = sqliteTable("genomic_interpretations", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), artifactId: text("artifact_id").notNull(), variantCallId: text("variant_call_id"), gene: text("gene").notNull(), rsid: text("rsid").notNull(), category: text("category").notNull(), title: text("title").notNull(), summary: text("summary").notNull(), evidenceLevel: text("evidence_level").notNull(), evidenceReleaseIdsJson: text("evidence_release_ids_json").notNull(), limitationsJson: text("limitations_json").notNull(), status: text("status").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_interpretations_member_status").on(table.memberId, table.status), index("idx_interpretations_artifact").on(table.artifactId)]);

export const genomicReanalysisRuns = sqliteTable("genomic_reanalysis_runs", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), artifactId: text("artifact_id").notNull(), previousRunId: text("previous_run_id"), trigger: text("trigger").notNull(), evidenceSetJson: text("evidence_set_json").notNull(), pipelineVersion: text("pipeline_version").notNull(), status: text("status").notNull(), summaryJson: text("summary_json").notNull(), createdAt: text("created_at").notNull(), completedAt: text("completed_at"),
}, (table) => [index("idx_reanalysis_member_created").on(table.memberId, table.createdAt), index("idx_reanalysis_artifact").on(table.artifactId)]);

export const crossModalFindings = sqliteTable("cross_modal_findings", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), snapshotId: text("snapshot_id").notNull(), domainCode: text("domain_code").notNull(), title: text("title").notNull(), statement: text("statement").notNull(), direction: text("direction").notNull(), confidence: real("confidence").notNull(), layersJson: text("layers_json").notNull(), evidenceRefsJson: text("evidence_refs_json").notNull(), missingJson: text("missing_json").notNull(), methodVersion: text("method_version").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_cross_modal_member_snapshot").on(table.memberId, table.snapshotId), uniqueIndex("idx_cross_modal_snapshot_domain_title").on(table.snapshotId, table.domainCode, table.title)]);

export const aiDraftRuns = sqliteTable("ai_draft_runs", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), task: text("task").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), inputHash: text("input_hash").notNull(), inputRefsJson: text("input_refs_json").notNull(), model: text("model").notNull(), promptVersion: text("prompt_version").notNull(), policyVersion: text("policy_version").notNull(), outputJson: text("output_json").notNull(), status: text("status").notNull(), error: text("error"), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_ai_drafts_member_created").on(table.memberId, table.createdAt), index("idx_ai_drafts_entity").on(table.entityType, table.entityId)]);

export const chatReviews = sqliteTable("chat_reviews", {
  id: text("id").primaryKey(), auditId: text("audit_id").notNull(), memberId: text("member_id").notNull(), reviewerId: text("reviewer_id").notNull(), verdict: text("verdict").notNull(), correction: text("correction").notNull(), note: text("note").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_chat_reviews_audit").on(table.auditId), index("idx_chat_reviews_member_created").on(table.memberId, table.createdAt)]);

export const labIntegrationEvents = sqliteTable("lab_integration_events", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), orderId: text("order_id"), provider: text("provider").notNull(), externalReference: text("external_reference"), eventType: text("event_type").notNull(), idempotencyKey: text("idempotency_key").notNull(), status: text("status").notNull(), payloadJson: text("payload_json").notNull(), createdAt: text("created_at").notNull(), processedAt: text("processed_at"),
}, (table) => [uniqueIndex("idx_lab_events_provider_idempotency").on(table.provider, table.idempotencyKey), index("idx_lab_events_member_created").on(table.memberId, table.createdAt)]);

export const companionPairingCodes = sqliteTable("companion_pairing_codes", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), codeHash: text("code_hash").notNull(), platform: text("platform").notNull(), expiresAt: text("expires_at").notNull(), consumedAt: text("consumed_at"), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_pairing_code_hash").on(table.codeHash), index("idx_pairing_member_expiry").on(table.memberId, table.expiresAt)]);

export const deviceInstallations = sqliteTable("device_installations", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), platform: text("platform").notNull(), deviceName: text("device_name").notNull(), appVersion: text("app_version").notNull(), tokenHash: text("token_hash").notNull(), status: text("status").notNull(), lastSyncAt: text("last_sync_at"), lastCursor: text("last_cursor"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_installation_token_hash").on(table.tokenHash), index("idx_installations_member_status").on(table.memberId, table.status)]);

export const nativeSyncBatches = sqliteTable("native_sync_batches", {
  id: text("id").primaryKey(), installationId: text("installation_id").notNull(), memberId: text("member_id").notNull(), idempotencyKey: text("idempotency_key").notNull(), platformCursor: text("platform_cursor"), sampleCount: integer("sample_count").notNull(), insertedCount: integer("inserted_count").notNull(), deletedCount: integer("deleted_count").notNull(), status: text("status").notNull(), error: text("error"), receivedAt: text("received_at").notNull(), completedAt: text("completed_at"),
}, (table) => [uniqueIndex("idx_native_batch_installation_key").on(table.installationId, table.idempotencyKey), index("idx_native_batch_member_time").on(table.memberId, table.receivedAt)]);

export const nativeHealthSamples = sqliteTable("native_health_samples", {
  id: text("id").primaryKey(), installationId: text("installation_id").notNull(), memberId: text("member_id").notNull(), platform: text("platform").notNull(), externalId: text("external_id").notNull(), typeCode: text("type_code").notNull(), valueNumber: real("value_number"), unit: text("unit"), startAt: text("start_at").notNull(), endAt: text("end_at").notNull(), timezone: text("timezone").notNull(), sourceName: text("source_name").notNull(), sourceBundle: text("source_bundle").notNull(), deviceJson: text("device_json").notNull(), metadataJson: text("metadata_json").notNull(), deletedAt: text("deleted_at"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_native_sample_installation_external").on(table.installationId, table.externalId), index("idx_native_samples_member_type_time").on(table.memberId, table.typeCode, table.startAt)]);

export const connectorSyncRuns = sqliteTable("connector_sync_runs", {
  id: text("id").primaryKey(), memberId: text("member_id"), provider: text("provider").notNull(), trigger: text("trigger").notNull(), status: text("status").notNull(), cursorBefore: text("cursor_before"), cursorAfter: text("cursor_after"), recordsRead: integer("records_read").notNull(), recordsWritten: integer("records_written").notNull(), latencyMs: integer("latency_ms").notNull(), errorCode: text("error_code"), startedAt: text("started_at").notNull(), completedAt: text("completed_at"),
}, (table) => [index("idx_connector_runs_provider_time").on(table.provider, table.startedAt), index("idx_connector_runs_member_time").on(table.memberId, table.startedAt)]);

export const researchConsents = sqliteTable("research_consents", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), noticeVersion: text("notice_version").notNull(), granted: integer("granted", { mode: "boolean" }).notNull(), scopesJson: text("scopes_json").notNull(), grantedAt: text("granted_at"), revokedAt: text("revoked_at"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_research_consent_member").on(table.memberId)]);

export const outcomeMeasurements = sqliteTable("outcome_measurements", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), targetCode: text("target_code").notNull(), windowCode: text("window_code").notNull(), baselineValue: real("baseline_value").notNull(), currentValue: real("current_value").notNull(), absoluteChange: real("absolute_change").notNull(), percentChange: real("percent_change"), unit: text("unit").notNull(), baselineAt: text("baseline_at").notNull(), currentAt: text("current_at").notNull(), adherence: real("adherence"), quality: real("quality").notNull(), sourceRefsJson: text("source_refs_json").notNull(), computedAt: text("computed_at").notNull(),
}, (table) => [uniqueIndex("idx_outcome_member_target_window").on(table.memberId, table.targetCode, table.windowCode), index("idx_outcome_target_time").on(table.targetCode, table.computedAt)]);

export const responseModelVersions = sqliteTable("response_model_versions", {
  id: text("id").primaryKey(), targetCode: text("target_code").notNull(), version: integer("version").notNull(), status: text("status").notNull(), featureCodesJson: text("feature_codes_json").notNull(), coefficientsJson: text("coefficients_json").notNull(), trainingWindowJson: text("training_window_json").notNull(), metricsJson: text("metrics_json").notNull(), calibrationJson: text("calibration_json").notNull(), subgroupJson: text("subgroup_json").notNull(), abstentionJson: text("abstention_json").notNull(), dataSnapshotHash: text("data_snapshot_hash").notNull(), createdAt: text("created_at").notNull(), publishedAt: text("published_at"),
}, (table) => [uniqueIndex("idx_response_model_target_version").on(table.targetCode, table.version), index("idx_response_model_target_status").on(table.targetCode, table.status)]);

export const responsePredictions = sqliteTable("response_predictions", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), modelVersionId: text("model_version_id").notNull(), targetCode: text("target_code").notNull(), estimate: real("estimate"), lowerBound: real("lower_bound"), upperBound: real("upper_bound"), confidence: real("confidence").notNull(), status: text("status").notNull(), abstentionReason: text("abstention_reason"), featureSnapshotJson: text("feature_snapshot_json").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_predictions_member_target_time").on(table.memberId, table.targetCode, table.createdAt)]);

export const responseModelEvaluations = sqliteTable("response_model_evaluations", {
  id: text("id").primaryKey(), modelVersionId: text("model_version_id").notNull(), studyId: text("study_id").notNull(), datasetHash: text("dataset_hash").notNull(), cohortN: integer("cohort_n").notNull(), metricsJson: text("metrics_json").notNull(), calibrationJson: text("calibration_json").notNull(), subgroupJson: text("subgroup_json").notNull(), status: text("status").notNull(), evaluatorId: text("evaluator_id").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_model_evaluation_study").on(table.modelVersionId, table.studyId), index("idx_model_evaluation_status").on(table.status, table.createdAt)]);

export const experiments = sqliteTable("experiments", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), templateCode: text("template_code").notNull(), title: text("title").notNull(), hypothesis: text("hypothesis").notNull(), primaryOutcome: text("primary_outcome").notNull(), unit: text("unit").notNull(), status: text("status").notNull(), design: text("design").notNull(), startAt: text("start_at").notNull(), endAt: text("end_at").notNull(), protocolSnapshotId: text("protocol_snapshot_id"), resultJson: text("result_json").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_experiments_member_status").on(table.memberId, table.status)]);

export const experimentPeriods = sqliteTable("experiment_periods", {
  id: text("id").primaryKey(), experimentId: text("experiment_id").notNull(), memberId: text("member_id").notNull(), day: text("day").notNull(), arm: text("arm").notNull(), instruction: text("instruction").notNull(), completed: integer("completed", { mode: "boolean" }).notNull(), adherence: real("adherence"), outcomeValue: real("outcome_value"), contextJson: text("context_json").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_experiment_period_day").on(table.experimentId, table.day), index("idx_experiment_period_member_day").on(table.memberId, table.day)]);

export const memberJurisdictions = sqliteTable("member_jurisdictions", {
  memberId: text("member_id").primaryKey(), countryCode: text("country_code").notNull(), regionCode: text("region_code").notNull(), policyVersion: text("policy_version").notNull(), featuresJson: text("features_json").notNull(), updatedAt: text("updated_at").notNull(),
});

export const fhirExports = sqliteTable("fhir_exports", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull(), standard: text("standard").notNull(), profileVersion: text("profile_version").notNull(), purpose: text("purpose").notNull(), bundleHash: text("bundle_hash").notNull(), objectKey: text("object_key"), status: text("status").notNull(), destination: text("destination"), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_fhir_exports_member_time").on(table.memberId, table.createdAt)]);

export const backupRuns = sqliteTable("backup_runs", {
  id: text("id").primaryKey(),
  objectKey: text("object_key").notNull(),
  status: text("status").notNull(),
  tableCount: integer("table_count").notNull(),
  rowCount: integer("row_count").notNull(),
  bytes: integer("bytes").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  triggeredBy: text("triggered_by").notNull(),
  createdAt: text("created_at").notNull(),
  verifiedAt: text("verified_at"),
  error: text("error"),
}, (table) => [index("idx_backup_runs_status_created").on(table.status, table.createdAt)]);
