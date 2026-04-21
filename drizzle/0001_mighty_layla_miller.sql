CREATE TABLE `rank_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`overtime_a_max_hours` integer DEFAULT 10 NOT NULL,
	`overtime_b_max_hours` integer DEFAULT 20 NOT NULL,
	`overtime_c_max_hours` integer DEFAULT 30 NOT NULL,
	`overtime_d_max_hours` integer DEFAULT 45 NOT NULL,
	`holiday_s_min_days` integer DEFAULT 130 NOT NULL,
	`holiday_a_min_days` integer DEFAULT 125 NOT NULL,
	`holiday_b_min_days` integer DEFAULT 120 NOT NULL,
	`holiday_c_min_days` integer DEFAULT 115 NOT NULL,
	`holiday_d_min_days` integer DEFAULT 110 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rank_settings_user_id_idx` ON `rank_settings` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rank_settings_user_id_unique` ON `rank_settings` (`user_id`);