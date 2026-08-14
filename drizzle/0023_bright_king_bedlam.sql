CREATE TABLE `ai_interview_session_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`question_id` text NOT NULL,
	`prompt` text NOT NULL,
	`answer_text` text NOT NULL,
	`score` integer NOT NULL,
	`strengths_json` text NOT NULL,
	`improvements_json` text NOT NULL,
	`follow_ups_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `ai_interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_interview_session_answers_session_id_idx` ON `ai_interview_session_answers` (`session_id`);--> statement-breakpoint
CREATE INDEX `ai_interview_session_answers_created_at_idx` ON `ai_interview_session_answers` (`created_at`);--> statement-breakpoint
CREATE TABLE `ai_interview_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`interview_type` text NOT NULL,
	`target_company` text NOT NULL,
	`question_set` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_interview_sessions_user_id_idx` ON `ai_interview_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_interview_sessions_updated_at_idx` ON `ai_interview_sessions` (`updated_at`);