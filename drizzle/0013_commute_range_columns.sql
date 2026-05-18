ALTER TABLE `jobs` ADD `commute_minutes_min` integer;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `commute_minutes_max` integer;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `commute_minutes_typical` integer;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `commute_data_kind` text;
--> statement-breakpoint
UPDATE `jobs`
SET
  `commute_minutes_min` = `commute_minutes`,
  `commute_minutes_max` = `commute_minutes`,
  `commute_minutes_typical` = `commute_minutes`,
  `commute_data_kind` = CASE WHEN `commute_minutes` IS NOT NULL THEN 'manual' ELSE NULL END
WHERE `commute_minutes` IS NOT NULL;
