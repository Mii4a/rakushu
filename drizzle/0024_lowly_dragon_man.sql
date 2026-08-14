CREATE TABLE `ai_interview_audio_deletion_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`recording_session_id` text NOT NULL,
	`attempted_at` integer NOT NULL,
	`actor` text NOT NULL,
	`outcome` text NOT NULL,
	`detail_code` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`recording_session_id`) REFERENCES `ai_interview_recording_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_interview_audio_deletion_logs_recording_session_id_idx` ON `ai_interview_audio_deletion_logs` (`recording_session_id`);--> statement-breakpoint
CREATE TABLE `ai_interview_confirmed_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`recording_session_id` text,
	`question_id` text NOT NULL,
	`source_kind` text DEFAULT 'text' NOT NULL,
	`raw_transcript_text_snapshot` text,
	`confirmed_text` text NOT NULL,
	`confirmed_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `ai_interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recording_session_id`) REFERENCES `ai_interview_recording_sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_interview_confirmed_answers_user_id_idx` ON `ai_interview_confirmed_answers` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_interview_confirmed_answers_session_id_idx` ON `ai_interview_confirmed_answers` (`session_id`);--> statement-breakpoint
CREATE INDEX `ai_interview_confirmed_answers_question_id_idx` ON `ai_interview_confirmed_answers` (`question_id`);--> statement-breakpoint
CREATE TABLE `ai_interview_recording_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`recording_session_id` text NOT NULL,
	`policy_version` text NOT NULL,
	`consent_text_hash` text NOT NULL,
	`consented_at` integer NOT NULL,
	`ip_hash` text,
	`user_agent_hash` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recording_session_id`) REFERENCES `ai_interview_recording_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_interview_recording_consents_recording_session_id_idx` ON `ai_interview_recording_consents` (`recording_session_id`);--> statement-breakpoint
CREATE TABLE `ai_interview_recording_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text,
	`question_id` text NOT NULL,
	`input_method` text DEFAULT 'voice' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`mime_type` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`byte_size` integer NOT NULL,
	`temp_object_key` text,
	`audio_delete_state` text DEFAULT 'pending' NOT NULL,
	`audio_deleted_at` integer,
	`last_error_code` text,
	`last_error_summary` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `ai_interview_sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_interview_recording_sessions_user_id_idx` ON `ai_interview_recording_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_interview_recording_sessions_session_id_idx` ON `ai_interview_recording_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `ai_interview_recording_sessions_status_idx` ON `ai_interview_recording_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `ai_interview_recording_sessions_audio_delete_state_idx` ON `ai_interview_recording_sessions` (`audio_delete_state`);--> statement-breakpoint
CREATE INDEX `ai_interview_recording_sessions_updated_at_idx` ON `ai_interview_recording_sessions` (`updated_at`);--> statement-breakpoint
CREATE TABLE `ai_interview_transcription_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`transcription_id` text NOT NULL,
	`segment_index` integer NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	`text` text NOT NULL,
	`avg_logprob` text,
	`no_speech_prob` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`transcription_id`) REFERENCES `ai_interview_transcriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_interview_transcription_segments_unique` ON `ai_interview_transcription_segments` (`transcription_id`,`segment_index`);--> statement-breakpoint
CREATE TABLE `ai_interview_transcriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`recording_session_id` text NOT NULL,
	`provider` text DEFAULT 'faster-whisper' NOT NULL,
	`model_name` text NOT NULL,
	`language_code` text DEFAULT 'ja' NOT NULL,
	`raw_transcript_text` text,
	`normalized_transcript_text` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`recording_session_id`) REFERENCES `ai_interview_recording_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_interview_transcriptions_recording_session_unique` ON `ai_interview_transcriptions` (`recording_session_id`);--> statement-breakpoint
CREATE INDEX `ai_interview_transcriptions_status_idx` ON `ai_interview_transcriptions` (`status`);--> statement-breakpoint
ALTER TABLE `ai_interview_session_answers` ADD `confirmed_answer_id` text REFERENCES ai_interview_confirmed_answers(id);--> statement-breakpoint
ALTER TABLE `ai_interview_session_answers` ADD `recording_session_id` text REFERENCES ai_interview_recording_sessions(id);--> statement-breakpoint
ALTER TABLE `ai_interview_session_answers` ADD `answer_source_kind` text DEFAULT 'text' NOT NULL;--> statement-breakpoint
CREATE INDEX `ai_interview_session_answers_confirmed_answer_id_idx` ON `ai_interview_session_answers` (`confirmed_answer_id`);