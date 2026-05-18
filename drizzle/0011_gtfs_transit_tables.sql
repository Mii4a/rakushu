CREATE TABLE `transit_feeds` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_name` text NOT NULL,
	`source_url` text,
	`license_note` text,
	`region` text NOT NULL,
	`valid_from` text,
	`valid_to` text,
	`fetched_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transit_feeds_region_idx` ON `transit_feeds` (`region`);
--> statement-breakpoint
CREATE INDEX `transit_feeds_provider_name_idx` ON `transit_feeds` (`provider_name`);
--> statement-breakpoint
CREATE TABLE `transit_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_id` text NOT NULL,
	`stop_id` text NOT NULL,
	`stop_name` text NOT NULL,
	`stop_lat` text,
	`stop_lon` text,
	`parent_station` text,
	`platform_code` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `transit_feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transit_stops_feed_id_idx` ON `transit_stops` (`feed_id`);
--> statement-breakpoint
CREATE INDEX `transit_stops_stop_name_idx` ON `transit_stops` (`stop_name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transit_stops_feed_stop_unique` ON `transit_stops` (`feed_id`,`stop_id`);
--> statement-breakpoint
CREATE TABLE `transit_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_id` text NOT NULL,
	`trip_id` text NOT NULL,
	`route_id` text,
	`service_id` text,
	`trip_short_name` text,
	`trip_headsign` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `transit_feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transit_trips_feed_id_idx` ON `transit_trips` (`feed_id`);
--> statement-breakpoint
CREATE INDEX `transit_trips_route_id_idx` ON `transit_trips` (`route_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transit_trips_feed_trip_unique` ON `transit_trips` (`feed_id`,`trip_id`);
--> statement-breakpoint
CREATE TABLE `transit_stop_times` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_id` text NOT NULL,
	`trip_id` text NOT NULL,
	`stop_id` text NOT NULL,
	`arrival_time` text,
	`departure_time` text,
	`stop_sequence` integer NOT NULL,
	`stop_headsign` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `transit_feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transit_stop_times_feed_id_idx` ON `transit_stop_times` (`feed_id`);
--> statement-breakpoint
CREATE INDEX `transit_stop_times_trip_id_idx` ON `transit_stop_times` (`trip_id`);
--> statement-breakpoint
CREATE INDEX `transit_stop_times_stop_id_idx` ON `transit_stop_times` (`stop_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transit_stop_times_feed_trip_sequence_unique` ON `transit_stop_times` (`feed_id`,`trip_id`,`stop_sequence`);
--> statement-breakpoint
CREATE TABLE `transit_station_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`normalized_name` text NOT NULL,
	`canonical_stop_id` text NOT NULL,
	`canonical_stop_name` text NOT NULL,
	`region` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transit_station_aliases_normalized_name_idx` ON `transit_station_aliases` (`normalized_name`);
--> statement-breakpoint
CREATE INDEX `transit_station_aliases_region_idx` ON `transit_station_aliases` (`region`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transit_station_aliases_name_stop_unique` ON `transit_station_aliases` (`normalized_name`,`canonical_stop_id`);
