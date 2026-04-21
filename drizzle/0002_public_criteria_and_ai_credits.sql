ALTER TABLE `usage_counters` ADD `ai_credits_used` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `criteria_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_template_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`editable` integer DEFAULT true NOT NULL,
	`overtime_a_max_hours` integer DEFAULT 10 NOT NULL,
	`overtime_b_max_hours` integer DEFAULT 20 NOT NULL,
	`overtime_c_max_hours` integer DEFAULT 30 NOT NULL,
	`overtime_d_max_hours` integer DEFAULT 45 NOT NULL,
	`holiday_s_min_days` integer DEFAULT 130 NOT NULL,
	`holiday_a_min_days` integer DEFAULT 125 NOT NULL,
	`holiday_b_min_days` integer DEFAULT 120 NOT NULL,
	`holiday_c_min_days` integer DEFAULT 115 NOT NULL,
	`holiday_d_min_days` integer DEFAULT 110 NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`save_count` integer DEFAULT 0 NOT NULL,
	`clone_count` integer DEFAULT 0 NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`popularity_score` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `criteria_templates_user_id_idx` ON `criteria_templates` (`user_id`);
--> statement-breakpoint
CREATE INDEX `criteria_templates_visibility_idx` ON `criteria_templates` (`visibility`);
--> statement-breakpoint
CREATE INDEX `criteria_templates_category_idx` ON `criteria_templates` (`category`);
--> statement-breakpoint
CREATE INDEX `criteria_templates_popularity_idx` ON `criteria_templates` (`popularity_score`);
--> statement-breakpoint
CREATE TABLE `saved_criteria_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `criteria_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_criteria_templates_user_id_idx` ON `saved_criteria_templates` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_criteria_templates_user_template_unique` ON `saved_criteria_templates` (`user_id`,`template_id`);
--> statement-breakpoint
CREATE TABLE `criteria_usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text NOT NULL,
	`event_type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `criteria_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `criteria_usage_events_user_id_idx` ON `criteria_usage_events` (`user_id`);
--> statement-breakpoint
CREATE INDEX `criteria_usage_events_template_id_idx` ON `criteria_usage_events` (`template_id`);
--> statement-breakpoint
CREATE INDEX `criteria_usage_events_event_type_idx` ON `criteria_usage_events` (`event_type`);
