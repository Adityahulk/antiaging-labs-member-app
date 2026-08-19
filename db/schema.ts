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
