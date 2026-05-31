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
INSERT INTO `__new_job_analysis_feedback` (
	`id`,
	`job_analysis_id`,
	`status`,
	`source`,
	`severity`,
	`failure_types_json`,
	`summary_text`,
	`raw_excerpt`,
	`user_reason_code`,
	`user_note`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`job_analysis_id`,
	`status`,
	`source`,
	`severity`,
	`failure_types_json`,
	`summary_text`,
	`raw_excerpt`,
	`user_reason_code`,
	`user_note`,
	`created_at`,
	`updated_at`
FROM `job_analysis_feedback`;
--> statement-breakpoint
DROP TABLE `job_analysis_feedback`;
--> statement-breakpoint
ALTER TABLE `__new_job_analysis_feedback` RENAME TO `job_analysis_feedback`;
--> statement-breakpoint
CREATE UNIQUE INDEX `job_analysis_feedback_job_analysis_id_unique` ON `job_analysis_feedback` (`job_analysis_id`);
--> statement-breakpoint
CREATE INDEX `job_analysis_feedback_status_idx` ON `job_analysis_feedback` (`status`);
--> statement-breakpoint
CREATE INDEX `job_analysis_feedback_created_at_idx` ON `job_analysis_feedback` (`created_at`);
--> statement-breakpoint
CREATE INDEX `job_analysis_feedback_severity_idx` ON `job_analysis_feedback` (`severity`);
