CREATE TABLE `ai_interview_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`prompt` text NOT NULL,
	`answer_text` text NOT NULL,
	`score` integer NOT NULL,
	`strengths_json` text NOT NULL,
	`improvements_json` text NOT NULL,
	`follow_ups_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_interview_attempts_user_id_idx` ON `ai_interview_attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_interview_attempts_created_at_idx` ON `ai_interview_attempts` (`created_at`);--> statement-breakpoint
CREATE INDEX `ai_interview_attempts_question_id_idx` ON `ai_interview_attempts` (`question_id`);--> statement-breakpoint
CREATE TABLE `company_researches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`query` text NOT NULL,
	`company_name` text NOT NULL,
	`industry` text NOT NULL,
	`location` text NOT NULL,
	`size` text NOT NULL,
	`summary` text NOT NULL,
	`key_points_json` text NOT NULL,
	`interview_hints_json` text NOT NULL,
	`next_actions_json` text NOT NULL,
	`status` text DEFAULT '要点整理済み' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `company_researches_user_id_idx` ON `company_researches` (`user_id`);--> statement-breakpoint
CREATE INDEX `company_researches_created_at_idx` ON `company_researches` (`created_at`);