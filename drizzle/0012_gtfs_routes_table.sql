CREATE TABLE `transit_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_id` text NOT NULL,
	`route_id` text NOT NULL,
	`route_short_name` text,
	`route_long_name` text,
	`route_desc` text,
	`route_type` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `transit_feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transit_routes_feed_id_idx` ON `transit_routes` (`feed_id`);
--> statement-breakpoint
CREATE INDEX `transit_routes_route_short_name_idx` ON `transit_routes` (`route_short_name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transit_routes_feed_route_unique` ON `transit_routes` (`feed_id`,`route_id`);
