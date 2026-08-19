CREATE TABLE `ai_draft_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`task` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`input_refs_json` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`policy_version` text NOT NULL,
	`output_json` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_drafts_member_created` ON `ai_draft_runs` (`member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_drafts_entity` ON `ai_draft_runs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `chat_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`member_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`verdict` text NOT NULL,
	`correction` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_chat_reviews_audit` ON `chat_reviews` (`audit_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_reviews_member_created` ON `chat_reviews` (`member_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `cross_modal_findings` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`domain_code` text NOT NULL,
	`title` text NOT NULL,
	`statement` text NOT NULL,
	`direction` text NOT NULL,
	`confidence` real NOT NULL,
	`layers_json` text NOT NULL,
	`evidence_refs_json` text NOT NULL,
	`missing_json` text NOT NULL,
	`method_version` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_cross_modal_member_snapshot` ON `cross_modal_findings` (`member_id`,`snapshot_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cross_modal_snapshot_domain_title` ON `cross_modal_findings` (`snapshot_id`,`domain_code`,`title`);--> statement-breakpoint
CREATE TABLE `evidence_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`version` text NOT NULL,
	`released_at` text NOT NULL,
	`checksum` text NOT NULL,
	`status` text NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_source_version` ON `evidence_releases` (`source`,`version`);--> statement-breakpoint
CREATE TABLE `genomic_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`upload_id` text,
	`kind` text NOT NULL,
	`format` text NOT NULL,
	`genome_build` text,
	`sample_id` text,
	`object_key` text NOT NULL,
	`checksum_sha256` text NOT NULL,
	`size` integer NOT NULL,
	`status` text NOT NULL,
	`qc_json` text NOT NULL,
	`pipeline_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_genomic_artifacts_member_created` ON `genomic_artifacts` (`member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_genomic_artifacts_status` ON `genomic_artifacts` (`status`);--> statement-breakpoint
CREATE TABLE `genomic_interpretations` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`artifact_id` text NOT NULL,
	`variant_call_id` text,
	`gene` text NOT NULL,
	`rsid` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`evidence_level` text NOT NULL,
	`evidence_release_ids_json` text NOT NULL,
	`limitations_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_interpretations_member_status` ON `genomic_interpretations` (`member_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_interpretations_artifact` ON `genomic_interpretations` (`artifact_id`);--> statement-breakpoint
CREATE TABLE `genomic_reanalysis_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`artifact_id` text NOT NULL,
	`previous_run_id` text,
	`trigger` text NOT NULL,
	`evidence_set_json` text NOT NULL,
	`pipeline_version` text NOT NULL,
	`status` text NOT NULL,
	`summary_json` text NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_reanalysis_member_created` ON `genomic_reanalysis_runs` (`member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reanalysis_artifact` ON `genomic_reanalysis_runs` (`artifact_id`);--> statement-breakpoint
CREATE TABLE `genomic_variant_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`artifact_id` text NOT NULL,
	`member_id` text NOT NULL,
	`rsid` text,
	`chromosome` text NOT NULL,
	`position` integer NOT NULL,
	`reference_allele` text,
	`alternate_allele` text,
	`genotype` text,
	`phased` integer NOT NULL,
	`call_state` text NOT NULL,
	`filter` text,
	`quality` real,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_variant_calls_artifact` ON `genomic_variant_calls` (`artifact_id`);--> statement-breakpoint
CREATE INDEX `idx_variant_calls_member_rsid` ON `genomic_variant_calls` (`member_id`,`rsid`);--> statement-breakpoint
CREATE INDEX `idx_variant_calls_member_position` ON `genomic_variant_calls` (`member_id`,`chromosome`,`position`);--> statement-breakpoint
CREATE TABLE `lab_integration_events` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`order_id` text,
	`provider` text NOT NULL,
	`external_reference` text,
	`event_type` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lab_events_provider_idempotency` ON `lab_integration_events` (`provider`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_lab_events_member_created` ON `lab_integration_events` (`member_id`,`created_at`);