CREATE TABLE `job_status_events` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_status_events_job_id_idx` ON `job_status_events` (`job_id`);--> statement-breakpoint
ALTER TABLE `jobs` ADD `selection_status` text DEFAULT 'saved' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `next_action_at` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `selection_memo` text;--> statement-breakpoint
ALTER TABLE `usage_counters` ADD `compare_count` integer DEFAULT 0 NOT NULL;