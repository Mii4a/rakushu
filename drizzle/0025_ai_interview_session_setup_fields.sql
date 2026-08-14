ALTER TABLE `ai_interview_sessions` ADD `setting_set_name` text NOT NULL DEFAULT '基本セット';
--> statement-breakpoint
ALTER TABLE `ai_interview_sessions` ADD `target_role` text NOT NULL DEFAULT '営業職';
--> statement-breakpoint
ALTER TABLE `ai_interview_sessions` ADD `scenario_type` text NOT NULL DEFAULT 'new-grad';
