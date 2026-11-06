-- Close step for advising requests + optional student satisfaction rating
ALTER TABLE `advising_requests` ADD `closed_at` text;
--> statement-breakpoint
ALTER TABLE `advising_requests` ADD `satisfaction_rating` integer;
--> statement-breakpoint
ALTER TABLE `advising_requests` ADD `satisfaction_comment` text;
--> statement-breakpoint
ALTER TABLE `advising_requests` ADD `satisfaction_at` text;
