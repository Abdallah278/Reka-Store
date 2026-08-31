CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int,
	`name` varchar(160) NOT NULL,
	`department` varchar(32) NOT NULL DEFAULT 'makeup',
	`unitPrice` int NOT NULL,
	`quantity` int NOT NULL,
	`lineTotal` int NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`fromStatus` varchar(24),
	`toStatus` varchar(24) NOT NULL,
	`actor` varchar(64) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(24) NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'pending_contact',
	`customerName` varchar(120) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`whatsapp` varchar(32),
	`city` varchar(80) NOT NULL,
	`address` text NOT NULL,
	`building` varchar(160),
	`deliveryNotes` text,
	`subtotal` int NOT NULL,
	`deliveryFee` int NOT NULL DEFAULT 0,
	`total` int NOT NULL,
	`ownerNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`customerName` varchar(80) NOT NULL,
	`rating` int NOT NULL,
	`body` text,
	`status` varchar(12) NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `originalPrice` int;--> statement-breakpoint
ALTER TABLE `products` ADD `offerEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `products` ADD `department` varchar(32) DEFAULT 'makeup' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `brand` varchar(120);--> statement-breakpoint
ALTER TABLE `products` ADD `sku` varchar(64);--> statement-breakpoint
ALTER TABLE `products` ADD `productNotes` text;--> statement-breakpoint
ALTER TABLE `products` ADD `variantLabel` varchar(160);--> statement-breakpoint
ALTER TABLE `store_settings` ADD `deliveryFee` int DEFAULT 0 NOT NULL;