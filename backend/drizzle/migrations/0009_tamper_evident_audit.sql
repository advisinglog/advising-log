ALTER TABLE `audit_logs` ADD COLUMN `prev_hash` text;
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD COLUMN `hash` text;
