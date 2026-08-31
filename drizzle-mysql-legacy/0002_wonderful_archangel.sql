ALTER TABLE `store_settings` MODIFY COLUMN `storeName` varchar(120) NOT NULL DEFAULT 'Reka Store';--> statement-breakpoint
ALTER TABLE `store_settings` MODIFY COLUMN `primaryColor` varchar(20) NOT NULL DEFAULT '#310E10';--> statement-breakpoint
ALTER TABLE `store_settings` MODIFY COLUMN `accentColor` varchar(20) NOT NULL DEFAULT '#74070E';--> statement-breakpoint
ALTER TABLE `store_settings` MODIFY COLUMN `heroTitle` varchar(180) NOT NULL DEFAULT 'Beauty, your way';