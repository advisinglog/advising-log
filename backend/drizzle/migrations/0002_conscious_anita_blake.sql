CREATE TABLE `advising_category_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`label_th` text NOT NULL,
	`label_en` text NOT NULL,
	`sub_categories` text DEFAULT '[]' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `advising_category_configs_value_unique` ON `advising_category_configs` (`value`);--> statement-breakpoint
CREATE TABLE `document_type_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`label_th` text NOT NULL,
	`label_en` text NOT NULL,
	`allowed_formats` text DEFAULT '["PDF","JPG","PNG"]' NOT NULL,
	`max_size_mb` integer DEFAULT 10 NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_type_configs_name_unique` ON `document_type_configs` (`name`);