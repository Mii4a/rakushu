CREATE TABLE `ai_interview_generated_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`category_id` text NOT NULL,
	`question_id` text NOT NULL,
	`question_number` integer NOT NULL,
	`prompt` text NOT NULL,
	`based_on_answer_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `ai_interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`based_on_answer_id`) REFERENCES `ai_interview_session_answers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_interview_generated_questions_session_id_idx` ON `ai_interview_generated_questions` (`session_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_interview_generated_questions_session_question_unique` ON `ai_interview_generated_questions` (`session_id`,`question_id`);
--> statement-breakpoint
CREATE TABLE `ai_interview_category_feedbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`category_id` text NOT NULL,
	`start_question_number` integer NOT NULL,
	`end_question_number` integer NOT NULL,
	`overall_score` integer NOT NULL,
	`summary_text` text NOT NULL,
	`strengths_json` text NOT NULL,
	`improvements_json` text NOT NULL,
	`next_focus_text` text NOT NULL,
	`next_questions_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `ai_interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_interview_category_feedbacks_session_id_idx` ON `ai_interview_category_feedbacks` (`session_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_interview_category_feedbacks_session_category_unique` ON `ai_interview_category_feedbacks` (`session_id`,`category_id`);
