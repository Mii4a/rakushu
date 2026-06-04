PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_job_analysis_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`job_analysis_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL,
	`severity` text NOT NULL,
	`failure_types_json` text NOT NULL,
	`summary_text` text NOT NULL,
	`raw_excerpt` text,
	`user_reason_code` text,
	`user_note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`job_analysis_id`) REFERENCES `job_analyses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_job_analysis_feedback`("id", "job_analysis_id", "status", "source", "severity", "failure_types_json", "summary_text", "raw_excerpt", "user_reason_code", "user_note", "created_at", "updated_at") SELECT "id", "job_analysis_id", "status", "source", "severity", "failure_types_json", "summary_text", "raw_excerpt", "user_reason_code", "user_note", "created_at", "updated_at" FROM `job_analysis_feedback`;--> statement-breakpoint
DROP TABLE `job_analysis_feedback`;--> statement-breakpoint
ALTER TABLE `__new_job_analysis_feedback` RENAME TO `job_analysis_feedback`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `job_analysis_feedback_job_analysis_id_unique` ON `job_analysis_feedback` (`job_analysis_id`);--> statement-breakpoint
CREATE INDEX `job_analysis_feedback_status_idx` ON `job_analysis_feedback` (`status`);--> statement-breakpoint
CREATE INDEX `job_analysis_feedback_created_at_idx` ON `job_analysis_feedback` (`created_at`);--> statement-breakpoint
CREATE INDEX `job_analysis_feedback_severity_idx` ON `job_analysis_feedback` (`severity`);--> statement-breakpoint
CREATE TABLE `__new_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company_name` text,
	`title` text,
	`source_name` text,
	`source_url` text,
	`work_address` text,
	`nearest_station` text,
	`commute_minutes` integer,
	`commute_minutes_min` integer,
	`commute_minutes_max` integer,
	`commute_minutes_typical` integer,
	`commute_data_kind` text,
	`selection_status` text DEFAULT 'saved' NOT NULL,
	`next_action_at` integer,
	`selection_memo` text,
	`raw_text` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_jobs`("id", "user_id", "company_name", "title", "source_name", "source_url", "work_address", "nearest_station", "commute_minutes", "commute_minutes_min", "commute_minutes_max", "commute_minutes_typical", "commute_data_kind", "selection_status", "next_action_at", "selection_memo", "raw_text", "created_at", "updated_at") SELECT "id", "user_id", "company_name", "title", "source_name", "source_url", "work_address", "nearest_station", "commute_minutes", "commute_minutes_min", "commute_minutes_max", "commute_minutes_typical", "commute_data_kind", "selection_status", "next_action_at", "selection_memo", "raw_text", "created_at", "updated_at" FROM `jobs`;--> statement-breakpoint
DROP TABLE `jobs`;--> statement-breakpoint
ALTER TABLE `__new_jobs` RENAME TO `jobs`;--> statement-breakpoint
CREATE INDEX `jobs_user_id_idx` ON `jobs` (`user_id`);--> statement-breakpoint
ALTER TABLE `job_analyses` ADD `missing_item_summary_json` text;