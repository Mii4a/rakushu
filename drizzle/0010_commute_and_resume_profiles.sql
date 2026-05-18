ALTER TABLE `jobs` ADD `work_address` text;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `nearest_station` text;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `commute_minutes` integer;
--> statement-breakpoint
CREATE TABLE `user_commute_profiles` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `home_address` text,
  `home_nearest_station` text,
  `preferred_max_commute_minutes` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_commute_profiles_user_id_idx` ON `user_commute_profiles` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_commute_profiles_user_id_unique` ON `user_commute_profiles` (`user_id`);
--> statement-breakpoint
CREATE TABLE `resume_profiles` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `template_name` text,
  `full_name` text,
  `furigana` text,
  `phone` text,
  `email` text,
  `education` text,
  `experience` text,
  `self_pr` text,
  `motivation` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_profiles_user_id_idx` ON `resume_profiles` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `resume_profiles_user_id_unique` ON `resume_profiles` (`user_id`);
