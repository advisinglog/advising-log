ALTER TABLE `documents` ADD COLUMN `file_name` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `description` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `signature_method` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `uploaded_at` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `signed_at` text;
