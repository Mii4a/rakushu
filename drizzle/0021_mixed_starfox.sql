CREATE TABLE `user_onboarding_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`started` integer DEFAULT false NOT NULL,
	`current_step` integer DEFAULT 0 NOT NULL,
	`nickname` text,
	`applicant_status_json` text DEFAULT '[]' NOT NULL,
	`work_styles_json` text DEFAULT '[]' NOT NULL,
	`locations_json` text DEFAULT '[]' NOT NULL,
	`commute_preference` text,
	`location_note` text,
	`salary_preference` text,
	`avoid_conditions_json` text DEFAULT '[]' NOT NULL,
	`job_hunting_status` text,
	`priority_json` text DEFAULT '[]' NOT NULL,
	`deferred_roles` integer DEFAULT false NOT NULL,
	`deferred_skills` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`skipped_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_onboarding_profiles_user_id_idx` ON `user_onboarding_profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_onboarding_profiles_user_id_unique` ON `user_onboarding_profiles` (`user_id`);