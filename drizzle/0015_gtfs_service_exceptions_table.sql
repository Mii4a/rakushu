CREATE TABLE `transit_service_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_id` text NOT NULL,
	`service_id` text NOT NULL,
	`service_date` text NOT NULL,
	`exception_type` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `transit_feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transit_service_exceptions_feed_id_idx` ON `transit_service_exceptions` (`feed_id`);
--> statement-breakpoint
CREATE INDEX `transit_service_exceptions_service_date_idx` ON `transit_service_exceptions` (`service_date`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transit_service_exceptions_feed_service_date_unique` ON `transit_service_exceptions` (`feed_id`,`service_id`,`service_date`);
