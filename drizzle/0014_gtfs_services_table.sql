CREATE TABLE `transit_services` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_id` text NOT NULL,
	`service_id` text NOT NULL,
	`monday` integer DEFAULT false NOT NULL,
	`tuesday` integer DEFAULT false NOT NULL,
	`wednesday` integer DEFAULT false NOT NULL,
	`thursday` integer DEFAULT false NOT NULL,
	`friday` integer DEFAULT false NOT NULL,
	`saturday` integer DEFAULT false NOT NULL,
	`sunday` integer DEFAULT false NOT NULL,
	`start_date` text,
	`end_date` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `transit_feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transit_services_feed_id_idx` ON `transit_services` (`feed_id`);
--> statement-breakpoint
CREATE INDEX `transit_services_service_id_idx` ON `transit_services` (`service_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transit_services_feed_service_unique` ON `transit_services` (`feed_id`,`service_id`);
