CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`descripcion` text NOT NULL,
	`monto` real NOT NULL,
	`cat` text DEFAULT 'Otro' NOT NULL,
	`cat_custom` text DEFAULT '' NOT NULL,
	`payment_method_id` text,
	`obligation_id` text,
	`fecha` text NOT NULL,
	`moneda` text DEFAULT 'PEN' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`obligation_id`) REFERENCES `obligations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `exp_user_fecha` ON `expenses` (`user_id`,`fecha`);--> statement-breakpoint
CREATE TABLE `incomes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`descripcion` text NOT NULL,
	`monto` real NOT NULL,
	`cat` text DEFAULT 'Otro' NOT NULL,
	`cat_custom` text DEFAULT '' NOT NULL,
	`fecha` text NOT NULL,
	`moneda` text DEFAULT 'PEN' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inc_user_fecha` ON `incomes` (`user_id`,`fecha`);--> statement-breakpoint
CREATE TABLE `obligations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`nombre` text NOT NULL,
	`dia` integer DEFAULT 1 NOT NULL,
	`mes_inicio` text NOT NULL,
	`mes_fin` text,
	`monto` real DEFAULT 0 NOT NULL,
	`cat` text DEFAULT 'Otro' NOT NULL,
	`cat_custom` text DEFAULT '' NOT NULL,
	`tipo` text DEFAULT 'gasto' NOT NULL,
	`moneda` text DEFAULT 'PEN' NOT NULL,
	`payment_method_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `obl_user` ON `obligations` (`user_id`);--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pm_user` ON `payment_methods` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'PEN' NOT NULL,
	`wa_phone` text DEFAULT '' NOT NULL,
	`wa_key` text DEFAULT '' NOT NULL,
	`is_pro` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);