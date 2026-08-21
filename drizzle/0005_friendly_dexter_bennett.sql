CREATE TABLE `backup_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`status` text NOT NULL,
	`table_count` integer NOT NULL,
	`row_count` integer NOT NULL,
	`bytes` integer NOT NULL,
	`checksum_sha256` text NOT NULL,
	`triggered_by` text NOT NULL,
	`created_at` text NOT NULL,
	`verified_at` text,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `idx_backup_runs_status_created` ON `backup_runs` (`status`,`created_at`);