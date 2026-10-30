CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`related_id` text,
	`is_read` integer DEFAULT false NOT NULL,
	`email_status` text DEFAULT 'not_requested' NOT NULL,
	`email_error` text,
	`created_at` text NOT NULL,
	`read_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`,`created_at`);
