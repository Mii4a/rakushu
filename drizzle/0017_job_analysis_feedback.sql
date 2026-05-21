CREATE TABLE `job_analysis_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`job_analysis_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`source` text DEFAULT 'auto' NOT NULL,
	`severity` text NOT NULL,
	`failure_types_json` text NOT NULL,
	`summary_text` text NOT NULL,
	`raw_excerpt` text NOT NULL,
	`user_reason_code` text,
	`user_note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`job_analysis_id`) REFERENCES `job_analyses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_analysis_feedback_job_analysis_id_unique` ON `job_analysis_feedback` (`job_analysis_id`);--> statement-breakpoint
CREATE INDEX `job_analysis_feedback_status_idx` ON `job_analysis_feedback` (`status`);--> statement-breakpoint
CREATE INDEX `job_analysis_feedback_created_at_idx` ON `job_analysis_feedback` (`created_at`);--> statement-breakpoint
CREATE INDEX `job_analysis_feedback_severity_idx` ON `job_analysis_feedback` (`severity`);