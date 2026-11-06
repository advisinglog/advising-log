-- Server-side system settings (AI on/off switch is enforced by the API, not the browser)
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text
);
