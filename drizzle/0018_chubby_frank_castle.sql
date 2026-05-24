CREATE TABLE `beta_intake_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`contact` text NOT NULL,
	`current_status` text NOT NULL,
	`top_problem_category` text NOT NULL,
	`top_problem` text NOT NULL,
	`desired_job_category` text,
	`jobs_per_week_bucket` text,
	`interview_opt_in` integer DEFAULT false NOT NULL,
	`referrer` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_content` text,
	`utm_term` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `beta_intake_submissions_created_at_idx` ON `beta_intake_submissions` (`created_at`);--> statement-breakpoint
CREATE INDEX `beta_intake_submissions_current_status_idx` ON `beta_intake_submissions` (`current_status`);--> statement-breakpoint
CREATE INDEX `beta_intake_submissions_top_problem_category_idx` ON `beta_intake_submissions` (`top_problem_category`);--> statement-breakpoint
CREATE TABLE `marketing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`page` text,
	`referrer` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_content` text,
	`utm_term` text,
	`cta_variant` text,
	`current_status` text,
	`top_problem_category` text,
	`text_length_bucket` text,
	`total_rank` text,
	`interview_opt_in` integer,
	`metadata_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `marketing_events_event_type_idx` ON `marketing_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `marketing_events_created_at_idx` ON `marketing_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `marketing_events_utm_campaign_idx` ON `marketing_events` (`utm_campaign`);