CREATE TABLE `ai_usage_events` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text,
  `provider` text NOT NULL DEFAULT 'openai',
  `model` text NOT NULL,
  `feature_area` text NOT NULL,
  `action_key` text NOT NULL,
  `source_table` text,
  `source_id` text,
  `request_status` text NOT NULL,
  `input_tokens` integer NOT NULL DEFAULT 0,
  `cached_input_tokens` integer NOT NULL DEFAULT 0,
  `output_tokens` integer NOT NULL DEFAULT 0,
  `reasoning_tokens` integer NOT NULL DEFAULT 0,
  `total_tokens` integer NOT NULL DEFAULT 0,
  `web_search_calls` integer NOT NULL DEFAULT 0,
  `input_unit_price_micro_usd_per_1m` integer,
  `output_unit_price_micro_usd_per_1m` integer,
  `tool_cost_micro_usd` integer,
  `total_cost_micro_usd` integer,
  `fx_yen_per_usd_milli` integer,
  `total_cost_milli_yen` integer,
  `latency_ms` integer NOT NULL DEFAULT 0,
  `price_version` text,
  `error_code` text,
  `metadata_json` text NOT NULL DEFAULT '{}',
  `created_at` integer NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_usage_events_created_at_idx` ON `ai_usage_events` (`created_at`);
--> statement-breakpoint
CREATE INDEX `ai_usage_events_user_created_at_idx` ON `ai_usage_events` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `ai_usage_events_feature_created_at_idx` ON `ai_usage_events` (`feature_area`,`created_at`);
--> statement-breakpoint
CREATE INDEX `ai_usage_events_action_created_at_idx` ON `ai_usage_events` (`action_key`,`created_at`);
--> statement-breakpoint
CREATE INDEX `ai_usage_events_model_created_at_idx` ON `ai_usage_events` (`model`,`created_at`);
--> statement-breakpoint
CREATE INDEX `ai_usage_events_status_created_at_idx` ON `ai_usage_events` (`request_status`,`created_at`);
