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
