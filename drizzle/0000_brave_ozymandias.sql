CREATE TABLE `admin_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`detail_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_admin_events_created` ON `admin_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_admin_events_member` ON `admin_events` (`member_id`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`sources_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_member_conversation_time` ON `chat_messages` (`member_id`,`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`source_code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`status` text NOT NULL,
	`last_sync_at` text,
	`coverage` real NOT NULL,
	`metadata_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sources_member_code` ON `data_sources` (`member_id`,`source_code`);--> statement-breakpoint
CREATE INDEX `idx_sources_member_status` ON `data_sources` (`member_id`,`status`);--> statement-breakpoint
CREATE TABLE `intake_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`question_code` text NOT NULL,
	`module` text NOT NULL,
	`answer_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_intake_member_question` ON `intake_answers` (`member_id`,`question_code`);--> statement-breakpoint
CREATE INDEX `idx_intake_member_module` ON `intake_answers` (`member_id`,`module`);--> statement-breakpoint
CREATE TABLE `journey_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`step_code` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`state` text NOT NULL,
	`sort_order` integer NOT NULL,
	`due_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_journey_member_step` ON `journey_steps` (`member_id`,`step_code`);--> statement-breakpoint
CREATE INDEX `idx_journey_member_order` ON `journey_steps` (`member_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`primary_goal` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_email` ON `members` (`email`);--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`concept_code` text NOT NULL,
	`domain` text NOT NULL,
	`value_number` real,
	`value_text` text,
	`unit` text,
	`effective_at` text NOT NULL,
	`source` text NOT NULL,
	`quality` text NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_observations_member_domain_time` ON `observations` (`member_id`,`domain`,`effective_at`);--> statement-breakpoint
CREATE INDEX `idx_observations_member_concept_time` ON `observations` (`member_id`,`concept_code`,`effective_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`type` text NOT NULL,
	`product_name` text NOT NULL,
	`status` text NOT NULL,
	`reference` text NOT NULL,
	`vendor` text,
	`amount_paise` integer NOT NULL,
	`payment_status` text NOT NULL,
	`tracking_url` text,
	`appointment_at` text,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_orders_member_updated` ON `orders` (`member_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE TABLE `protocol_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`protocol_id` text NOT NULL,
	`member_id` text NOT NULL,
	`domain` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`scheduled_time` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`reason` text NOT NULL,
	`target` text NOT NULL,
	`done` integer NOT NULL,
	`done_at` text,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_actions_member_protocol_order` ON `protocol_actions` (`member_id`,`protocol_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_actions_member_done` ON `protocol_actions` (`member_id`,`done`);--> statement-breakpoint
CREATE TABLE `protocol_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`strategy` text NOT NULL,
	`started_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_protocol_member_version` ON `protocol_versions` (`member_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_protocol_member_status` ON `protocol_versions` (`member_id`,`status`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`source_date` text,
	`overview` text NOT NULL,
	`deep_dive_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reports_member_updated` ON `reports` (`member_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `twin_domains` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_id` text NOT NULL,
	`member_id` text NOT NULL,
	`domain_code` text NOT NULL,
	`label` text NOT NULL,
	`status` text NOT NULL,
	`state_label` text NOT NULL,
	`trend` text NOT NULL,
	`confidence` real NOT NULL,
	`freshness` text NOT NULL,
	`key_metric` text NOT NULL,
	`key_value` text NOT NULL,
	`key_unit` text,
	`target` text,
	`evidence_json` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_twin_domains_snapshot_code` ON `twin_domains` (`snapshot_id`,`domain_code`);--> statement-breakpoint
CREATE INDEX `idx_twin_domains_member` ON `twin_domains` (`member_id`);--> statement-breakpoint
CREATE TABLE `twin_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`version` integer NOT NULL,
	`as_of` text NOT NULL,
	`coverage` real NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_twin_member_version` ON `twin_snapshots` (`member_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_twin_member_asof` ON `twin_snapshots` (`member_id`,`as_of`);--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`type` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_uploads_member_created` ON `uploads` (`member_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text NOT NULL,
	`received_at` text NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_webhooks_provider_status` ON `webhook_events` (`provider`,`status`);