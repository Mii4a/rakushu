ALTER TABLE `jobs` ADD `selection_status` text DEFAULT 'saved' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `next_action_at` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `selection_memo` text;