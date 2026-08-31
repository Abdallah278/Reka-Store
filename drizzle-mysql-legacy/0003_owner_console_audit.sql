CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorOpenId` varchar(64) NOT NULL,
	`actorUserId` int,
	`action` varchar(64) NOT NULL,
	`targetType` varchar(32) NOT NULL,
	`targetId` varchar(64),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `store_settings` ADD `instagramUrl` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `sessionInvalidatedAt` timestamp;