ALTER TABLE `rank_settings` ADD `bonus_s_min_count` integer DEFAULT 3 NOT NULL;
--> statement-breakpoint
ALTER TABLE `rank_settings` ADD `bonus_a_min_count` integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE `rank_settings` ADD `bonus_b_min_count` integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE `rank_settings` ADD `bonus_c_min_count` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `rank_settings` ADD `retirement_with_allowance_rank` text DEFAULT 'A' NOT NULL;
--> statement-breakpoint
ALTER TABLE `rank_settings` ADD `retirement_without_allowance_rank` text DEFAULT 'D' NOT NULL;
--> statement-breakpoint
ALTER TABLE `criteria_templates` ADD `bonus_s_min_count` integer DEFAULT 3 NOT NULL;
--> statement-breakpoint
ALTER TABLE `criteria_templates` ADD `bonus_a_min_count` integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE `criteria_templates` ADD `bonus_b_min_count` integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE `criteria_templates` ADD `bonus_c_min_count` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `criteria_templates` ADD `retirement_with_allowance_rank` text DEFAULT 'A' NOT NULL;
--> statement-breakpoint
ALTER TABLE `criteria_templates` ADD `retirement_without_allowance_rank` text DEFAULT 'D' NOT NULL;
