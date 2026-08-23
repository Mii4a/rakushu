ALTER TABLE `account` ADD `issuer` text DEFAULT 'https://accounts.google.com' NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `account_issuer_account_unique` ON `account` (`issuer`,`account_id`);
--> statement-breakpoint
DROP INDEX `account_provider_account_unique`;
