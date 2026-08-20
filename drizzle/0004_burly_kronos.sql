CREATE TABLE `response_model_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`model_version_id` text NOT NULL,
	`study_id` text NOT NULL,
	`dataset_hash` text NOT NULL,
	`cohort_n` integer NOT NULL,
	`metrics_json` text NOT NULL,
	`calibration_json` text NOT NULL,
	`subgroup_json` text NOT NULL,
	`status` text NOT NULL,
	`evaluator_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_model_evaluation_study` ON `response_model_evaluations` (`model_version_id`,`study_id`);--> statement-breakpoint
CREATE INDEX `idx_model_evaluation_status` ON `response_model_evaluations` (`status`,`created_at`);