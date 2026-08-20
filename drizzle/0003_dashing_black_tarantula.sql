CREATE TABLE `companion_pairing_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`platform` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pairing_code_hash` ON `companion_pairing_codes` (`code_hash`);--> statement-breakpoint
CREATE INDEX `idx_pairing_member_expiry` ON `companion_pairing_codes` (`member_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `connector_sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text,
	`provider` text NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`cursor_before` text,
	`cursor_after` text,
	`records_read` integer NOT NULL,
	`records_written` integer NOT NULL,
	`latency_ms` integer NOT NULL,
	`error_code` text,
	`started_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_connector_runs_provider_time` ON `connector_sync_runs` (`provider`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_connector_runs_member_time` ON `connector_sync_runs` (`member_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `device_installations` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`platform` text NOT NULL,
	`device_name` text NOT NULL,
	`app_version` text NOT NULL,
	`token_hash` text NOT NULL,
	`status` text NOT NULL,
	`last_sync_at` text,
	`last_cursor` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_installation_token_hash` ON `device_installations` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_installations_member_status` ON `device_installations` (`member_id`,`status`);--> statement-breakpoint
CREATE TABLE `experiment_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`member_id` text NOT NULL,
	`day` text NOT NULL,
	`arm` text NOT NULL,
	`instruction` text NOT NULL,
	`completed` integer NOT NULL,
	`adherence` real,
	`outcome_value` real,
	`context_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_experiment_period_day` ON `experiment_periods` (`experiment_id`,`day`);--> statement-breakpoint
CREATE INDEX `idx_experiment_period_member_day` ON `experiment_periods` (`member_id`,`day`);--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`template_code` text NOT NULL,
	`title` text NOT NULL,
	`hypothesis` text NOT NULL,
	`primary_outcome` text NOT NULL,
	`unit` text NOT NULL,
	`status` text NOT NULL,
	`design` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`protocol_snapshot_id` text,
	`result_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_experiments_member_status` ON `experiments` (`member_id`,`status`);--> statement-breakpoint
CREATE TABLE `fhir_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`standard` text NOT NULL,
	`profile_version` text NOT NULL,
	`purpose` text NOT NULL,
	`bundle_hash` text NOT NULL,
	`object_key` text,
	`status` text NOT NULL,
	`destination` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_fhir_exports_member_time` ON `fhir_exports` (`member_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `member_jurisdictions` (
	`member_id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`region_code` text NOT NULL,
	`policy_version` text NOT NULL,
	`features_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `native_health_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`member_id` text NOT NULL,
	`platform` text NOT NULL,
	`external_id` text NOT NULL,
	`type_code` text NOT NULL,
	`value_number` real,
	`unit` text,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`timezone` text NOT NULL,
	`source_name` text NOT NULL,
	`source_bundle` text NOT NULL,
	`device_json` text NOT NULL,
	`metadata_json` text NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_native_sample_installation_external` ON `native_health_samples` (`installation_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `idx_native_samples_member_type_time` ON `native_health_samples` (`member_id`,`type_code`,`start_at`);--> statement-breakpoint
CREATE TABLE `native_sync_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_id` text NOT NULL,
	`member_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`platform_cursor` text,
	`sample_count` integer NOT NULL,
	`inserted_count` integer NOT NULL,
	`deleted_count` integer NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`received_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_native_batch_installation_key` ON `native_sync_batches` (`installation_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_native_batch_member_time` ON `native_sync_batches` (`member_id`,`received_at`);--> statement-breakpoint
CREATE TABLE `outcome_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`target_code` text NOT NULL,
	`window_code` text NOT NULL,
	`baseline_value` real NOT NULL,
	`current_value` real NOT NULL,
	`absolute_change` real NOT NULL,
	`percent_change` real,
	`unit` text NOT NULL,
	`baseline_at` text NOT NULL,
	`current_at` text NOT NULL,
	`adherence` real,
	`quality` real NOT NULL,
	`source_refs_json` text NOT NULL,
	`computed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_outcome_member_target_window` ON `outcome_measurements` (`member_id`,`target_code`,`window_code`);--> statement-breakpoint
CREATE INDEX `idx_outcome_target_time` ON `outcome_measurements` (`target_code`,`computed_at`);--> statement-breakpoint
CREATE TABLE `research_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`notice_version` text NOT NULL,
	`granted` integer NOT NULL,
	`scopes_json` text NOT NULL,
	`granted_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_research_consent_member` ON `research_consents` (`member_id`);--> statement-breakpoint
CREATE TABLE `response_model_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`target_code` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`feature_codes_json` text NOT NULL,
	`coefficients_json` text NOT NULL,
	`training_window_json` text NOT NULL,
	`metrics_json` text NOT NULL,
	`calibration_json` text NOT NULL,
	`subgroup_json` text NOT NULL,
	`abstention_json` text NOT NULL,
	`data_snapshot_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_response_model_target_version` ON `response_model_versions` (`target_code`,`version`);--> statement-breakpoint
CREATE INDEX `idx_response_model_target_status` ON `response_model_versions` (`target_code`,`status`);--> statement-breakpoint
CREATE TABLE `response_predictions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`model_version_id` text NOT NULL,
	`target_code` text NOT NULL,
	`estimate` real,
	`lower_bound` real,
	`upper_bound` real,
	`confidence` real NOT NULL,
	`status` text NOT NULL,
	`abstention_reason` text,
	`feature_snapshot_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_predictions_member_target_time` ON `response_predictions` (`member_id`,`target_code`,`created_at`);