ALTER TABLE `job_analyses` ADD `holiday_type_rank` text;
--> statement-breakpoint
UPDATE `job_analyses` SET `holiday_type_rank` = `benefit_rank` WHERE `holiday_type_rank` IS NULL AND `benefit_rank` IS NOT NULL;
--> statement-breakpoint
UPDATE `job_analyses` SET `benefit_rank` = NULL WHERE `holiday_type_rank` IS NOT NULL;
