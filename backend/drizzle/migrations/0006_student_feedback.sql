-- Anonymous anytime student feedback (no student reference by design)
CREATE TABLE `student_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`rating` integer,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `student_feedback_created_idx` ON `student_feedback` (`created_at`);
