CREATE TABLE `member_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`statement` text NOT NULL,
	`desired_outcome` text NOT NULL,
	`importance` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_member_goals_member_status` ON `member_goals` (`member_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_member_goals_member_updated` ON `member_goals` (`member_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `safety_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`status` text NOT NULL,
	`reason_codes_json` text NOT NULL,
	`evidence_refs_json` text NOT NULL,
	`policy_version` text NOT NULL,
	`decided_by` text NOT NULL,
	`decided_at` text NOT NULL,
	`expires_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_safety_member_status` ON `safety_decisions` (`member_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_safety_entity_time` ON `safety_decisions` (`entity_type`,`entity_id`,`decided_at`);--> statement-breakpoint
CREATE TABLE `priority_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`goal_id` text,
	`twin_snapshot_id` text,
	`safety_decision_id` text,
	`recommended_candidate_id` text,
	`status` text NOT NULL,
	`engine_version` text NOT NULL,
	`evidence_version` text NOT NULL,
	`input_snapshot_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_priority_assessments_member_time` ON `priority_assessments` (`member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_priority_assessments_status` ON `priority_assessments` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `priority_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`member_id` text NOT NULL,
	`candidate_code` text NOT NULL,
	`domain_code` text NOT NULL,
	`title` text NOT NULL,
	`user_importance` real NOT NULL,
	`actionability` real NOT NULL,
	`measurement_readiness` real NOT NULL,
	`evidence_confidence` real NOT NULL,
	`time_to_signal` real NOT NULL,
	`burden` real NOT NULL,
	`risk_penalty` real NOT NULL,
	`genetics_modifier` real NOT NULL,
	`final_score` real NOT NULL,
	`rank` integer NOT NULL,
	`rationale_json` text NOT NULL,
	`evidence_refs_json` text NOT NULL,
	`missing_json` text NOT NULL,
	`experiment_templates_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_priority_candidate_assessment_code` ON `priority_candidates` (`assessment_id`,`candidate_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_priority_candidate_assessment_rank` ON `priority_candidates` (`assessment_id`,`rank`);--> statement-breakpoint
CREATE INDEX `idx_priority_candidates_member_score` ON `priority_candidates` (`member_id`,`final_score`);--> statement-breakpoint
CREATE TABLE `intervention_episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`goal_id` text,
	`priority_candidate_id` text,
	`safety_decision_id` text NOT NULL,
	`source_experiment_id` text,
	`source_protocol_action_id` integer,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`hypothesis` text NOT NULL,
	`exact_instruction` text NOT NULL,
	`dose_or_duration` text,
	`frequency` text NOT NULL,
	`primary_outcome_code` text NOT NULL,
	`outcome_direction` text NOT NULL,
	`outcome_unit` text NOT NULL,
	`target_min` real,
	`target_max` real,
	`minimum_baseline_days` integer NOT NULL,
	`minimum_comparison_days` integer NOT NULL,
	`start_at` text,
	`end_at` text,
	`review_at` text NOT NULL,
	`evidence_version` text NOT NULL,
	`status` text NOT NULL,
	`decision` text,
	`decision_reason` text,
	`decided_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_interventions_member_status_review` ON `intervention_episodes` (`member_id`,`status`,`review_at`);--> statement-breakpoint
CREATE INDEX `idx_interventions_candidate` ON `intervention_episodes` (`priority_candidate_id`);--> statement-breakpoint
CREATE INDEX `idx_interventions_outcome` ON `intervention_episodes` (`primary_outcome_code`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interventions_one_active_member` ON `intervention_episodes` (`member_id`) WHERE `status` = 'active';--> statement-breakpoint
CREATE TABLE `intervention_exposures` (
	`id` text PRIMARY KEY NOT NULL,
	`intervention_episode_id` text NOT NULL,
	`member_id` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`occurred_at` text,
	`planned_value` text,
	`actual_value` text,
	`adherence` real NOT NULL,
	`completed` integer NOT NULL,
	`subjective_response` real,
	`adverse_effect` integer NOT NULL,
	`note` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exposure_episode_schedule` ON `intervention_exposures` (`intervention_episode_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `idx_exposures_member_time` ON `intervention_exposures` (`member_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `idx_exposures_episode_completed` ON `intervention_exposures` (`intervention_episode_id`,`completed`);--> statement-breakpoint
CREATE TABLE `context_events` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`intervention_episode_id` text,
	`occurred_at` text NOT NULL,
	`type` text NOT NULL,
	`severity` integer NOT NULL,
	`detail_json` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_context_member_time` ON `context_events` (`member_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_context_episode_time` ON `context_events` (`intervention_episode_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_context_type_time` ON `context_events` (`type`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `response_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`intervention_episode_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`primary_outcome_code` text NOT NULL,
	`outcome_direction` text NOT NULL,
	`unit` text NOT NULL,
	`baseline_start` text NOT NULL,
	`baseline_end` text NOT NULL,
	`comparison_start` text NOT NULL,
	`comparison_end` text NOT NULL,
	`baseline_value` real,
	`comparison_value` real,
	`absolute_change` real,
	`percent_change` real,
	`effect_estimate` real,
	`lower_bound` real,
	`upper_bound` real,
	`data_quality` real NOT NULL,
	`adherence` real NOT NULL,
	`baseline_usable_days` integer NOT NULL,
	`comparison_usable_days` integer NOT NULL,
	`confounders_json` text NOT NULL,
	`attribution_grade` text NOT NULL,
	`conclusion` text NOT NULL,
	`recommended_decision` text NOT NULL,
	`insufficiency_reasons_json` text NOT NULL,
	`source_refs_json` text NOT NULL,
	`analysis_version` text NOT NULL,
	`computed_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_response_assessment_episode_version` ON `response_assessments` (`intervention_episode_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_response_assessments_member_time` ON `response_assessments` (`member_id`,`computed_at`);--> statement-breakpoint
CREATE INDEX `idx_response_assessments_status_time` ON `response_assessments` (`status`,`computed_at`);--> statement-breakpoint
CREATE INDEX `idx_response_assessments_outcome_time` ON `response_assessments` (`primary_outcome_code`,`computed_at`);--> statement-breakpoint
CREATE TABLE `genetic_hypothesis_links` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`intervention_episode_id` text NOT NULL,
	`genomic_interpretation_id` text NOT NULL,
	`influence` text NOT NULL,
	`predicted_relationship` text NOT NULL,
	`observed_status` text NOT NULL,
	`evidence_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_genetic_link_intervention_interpretation` ON `genetic_hypothesis_links` (`intervention_episode_id`,`genomic_interpretation_id`);--> statement-breakpoint
CREATE INDEX `idx_genetic_links_member_status` ON `genetic_hypothesis_links` (`member_id`,`observed_status`);--> statement-breakpoint
CREATE INDEX `idx_genetic_links_interpretation` ON `genetic_hypothesis_links` (`genomic_interpretation_id`);--> statement-breakpoint
CREATE TABLE `product_events` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text,
	`event_name` text NOT NULL,
	`journey_state` text,
	`source` text NOT NULL,
	`cohort_code` text,
	`session_id` text,
	`schema_version` text NOT NULL,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_product_events_name_time` ON `product_events` (`event_name`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_product_events_member_time` ON `product_events` (`member_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_product_events_cohort_name` ON `product_events` (`cohort_code`,`event_name`);
