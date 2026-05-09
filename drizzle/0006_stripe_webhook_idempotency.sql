CREATE TABLE `stripe_webhook_events` (
  `id` text PRIMARY KEY NOT NULL,
  `stripe_event_id` text NOT NULL,
  `event_type` text NOT NULL,
  `processed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_webhook_events_stripe_event_id_unique` ON `stripe_webhook_events` (`stripe_event_id`);
--> statement-breakpoint
CREATE INDEX `stripe_webhook_events_event_type_idx` ON `stripe_webhook_events` (`event_type`);
