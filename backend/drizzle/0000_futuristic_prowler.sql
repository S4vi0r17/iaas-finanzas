CREATE TABLE `categories` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`scope` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`icon` varchar(32) NOT NULL DEFAULT '',
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`descripcion` varchar(255) NOT NULL,
	`monto` double NOT NULL,
	`cat` varchar(100) NOT NULL DEFAULT 'Otro',
	`payment_method_id` varchar(36),
	`obligation_id` varchar(36),
	`tipo` varchar(20) NOT NULL DEFAULT 'variable',
	`fecha` varchar(10) NOT NULL,
	`moneda` varchar(10) NOT NULL DEFAULT 'PEN',
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incomes` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`descripcion` varchar(255) NOT NULL,
	`monto` double NOT NULL,
	`cat` varchar(100) NOT NULL DEFAULT 'Otro',
	`fecha` varchar(10) NOT NULL,
	`moneda` varchar(10) NOT NULL DEFAULT 'PEN',
	CONSTRAINT `incomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `obligations` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`dia` int NOT NULL DEFAULT 1,
	`mes_inicio` varchar(7) NOT NULL,
	`mes_fin` varchar(7),
	`monto` double NOT NULL DEFAULT 0,
	`cat` varchar(100) NOT NULL DEFAULT 'Otro',
	`tipo` varchar(20) NOT NULL DEFAULT 'gasto',
	`moneda` varchar(10) NOT NULL DEFAULT 'PEN',
	`payment_method_id` varchar(36),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `obligations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(20) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT '',
	`currency` varchar(10) NOT NULL DEFAULT 'PEN',
	`wa_phone` varchar(32) NOT NULL DEFAULT '',
	`wa_key` varchar(255) NOT NULL DEFAULT '',
	`is_pro` boolean NOT NULL DEFAULT false,
	`created_at` bigint NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_obligation_id_obligations_id_fk` FOREIGN KEY (`obligation_id`) REFERENCES `obligations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incomes` ADD CONSTRAINT `incomes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `obligations` ADD CONSTRAINT `obligations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `obligations` ADD CONSTRAINT `obligations_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cat_user_scope` ON `categories` (`user_id`,`scope`);--> statement-breakpoint
CREATE INDEX `exp_user_fecha` ON `expenses` (`user_id`,`fecha`);--> statement-breakpoint
CREATE INDEX `inc_user_fecha` ON `incomes` (`user_id`,`fecha`);--> statement-breakpoint
CREATE INDEX `obl_user` ON `obligations` (`user_id`);--> statement-breakpoint
CREATE INDEX `pm_user` ON `payment_methods` (`user_id`);