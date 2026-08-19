CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`reviewer_id` text,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	`decided_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_approvals_entity` ON `approvals` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_approvals_status_role` ON `approvals` (`status`,`role`);--> statement-breakpoint
CREATE TABLE `catalog_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`version` integer NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`tax_paise` integer NOT NULL,
	`city` text NOT NULL,
	`turnaround_days` integer NOT NULL,
	`preparation_json` text NOT NULL,
	`cancellation_policy` text NOT NULL,
	`active` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_catalog_code_version` ON `catalog_versions` (`code`,`version`);--> statement-breakpoint
CREATE INDEX `idx_catalog_active_type` ON `catalog_versions` (`active`,`type`);--> statement-breakpoint
CREATE TABLE `chat_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`message_id` text NOT NULL,
	`snapshot_hash` text NOT NULL,
	`fields_json` text NOT NULL,
	`grounding_json` text NOT NULL,
	`model` text NOT NULL,
	`policy_version` text NOT NULL,
	`safety_class` text NOT NULL,
	`outcome` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_audits_member_time` ON `chat_audits` (`member_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_chat_audits_message` ON `chat_audits` (`message_id`);--> statement-breakpoint
CREATE TABLE `consent_records` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`purpose` text NOT NULL,
	`notice_version` text NOT NULL,
	`granted` integer NOT NULL,
	`evidence_json` text NOT NULL,
	`granted_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_consents_member_purpose` ON `consent_records` (`member_id`,`purpose`);--> statement-breakpoint
CREATE TABLE `daily_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`protocol_id` text NOT NULL,
	`day` text NOT NULL,
	`knob` text NOT NULL,
	`previous_value` text NOT NULL,
	`adjusted_value` text NOT NULL,
	`rationale` text NOT NULL,
	`twin_snapshot_id` text NOT NULL,
	`accepted` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_adjustments_member_day` ON `daily_adjustments` (`member_id`,`day`);--> statement-breakpoint
CREATE TABLE `member_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_member_roles_member_role` ON `member_roles` (`member_id`,`role`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`channel` text NOT NULL,
	`template` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_member_created` ON `notifications` (`member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_status` ON `notifications` (`status`);--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`provider` text NOT NULL,
	`verifier` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_oauth_states_member_provider` ON `oauth_states` (`member_id`,`provider`);--> statement-breakpoint
CREATE TABLE `observation_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`observation_id` text NOT NULL,
	`member_id` text NOT NULL,
	`status` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`previous_json` text NOT NULL,
	`note` text NOT NULL,
	`reviewed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_observation_reviews_observation` ON `observation_reviews` (`observation_id`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`member_id` text NOT NULL,
	`status` text NOT NULL,
	`actor_id` text NOT NULL,
	`source` text NOT NULL,
	`public_message` text NOT NULL,
	`internal_note` text NOT NULL,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_order_events_order_time` ON `order_events` (`order_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_order_events_member_time` ON `order_events` (`member_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `payment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`member_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_order_id` text,
	`provider_payment_id` text,
	`amount_paise` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`detail_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_idempotency` ON `payment_attempts` (`member_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_payments_provider_order` ON `payment_attempts` (`provider_order_id`);--> statement-breakpoint
CREATE TABLE `processing_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`upload_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer NOT NULL,
	`result_json` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_member_status` ON `processing_jobs` (`member_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_jobs_upload` ON `processing_jobs` (`upload_id`);--> statement-breakpoint
CREATE TABLE `wearable_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`external_user_id` text,
	`encrypted_token_json` text,
	`scopes_json` text NOT NULL,
	`cursor` text,
	`last_sync_at` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_connections_member_provider` ON `wearable_connections` (`member_id`,`provider`);--> statement-breakpoint
CREATE INDEX `idx_connections_status_sync` ON `wearable_connections` (`status`,`last_sync_at`);--> statement-breakpoint
CREATE TABLE `wearable_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`provider` text NOT NULL,
	`day` text NOT NULL,
	`timezone` text NOT NULL,
	`sleep_minutes` real,
	`sleep_score` real,
	`hrv_rmssd` real,
	`resting_hr` real,
	`steps` real,
	`active_calories` real,
	`workout_minutes` real,
	`quality` real NOT NULL,
	`raw_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_wearable_daily_member_provider_day` ON `wearable_daily` (`member_id`,`provider`,`day`);--> statement-breakpoint
CREATE INDEX `idx_wearable_daily_member_day` ON `wearable_daily` (`member_id`,`day`);