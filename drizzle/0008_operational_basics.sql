CREATE TABLE `support_tickets` (
  `id` text PRIMARY KEY NOT NULL,
  `member_id` text NOT NULL,
  `category` text NOT NULL,
  `urgency` text NOT NULL,
  `subject` text NOT NULL,
  `message` text NOT NULL,
  `status` text NOT NULL,
  `source` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `resolved_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_support_tickets_status_created` ON `support_tickets` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_support_tickets_member_created` ON `support_tickets` (`member_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `data_rights_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `member_id` text NOT NULL,
  `request_type` text NOT NULL,
  `status` text NOT NULL,
  `note` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_rights_requests_member_status` ON `data_rights_requests` (`member_id`,`status`);
