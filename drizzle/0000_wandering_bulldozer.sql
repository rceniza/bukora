CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`event_type` text NOT NULL,
	`summary` text NOT NULL,
	`details_json` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `booking_activity_booking_created_idx` ON `booking_activity` (`booking_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `booking_line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`kind` text NOT NULL,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_amount_minor` integer NOT NULL,
	`total_amount_minor` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "booking_line_items_kind_check" CHECK("booking_line_items"."kind" in ('base_package', 'included_room', 'additional_room', 'videoke', 'custom_charge', 'discount')),
	CONSTRAINT "booking_line_items_quantity_positive_check" CHECK("booking_line_items"."quantity" > 0),
	CONSTRAINT "booking_line_items_total_consistency_check" CHECK("booking_line_items"."total_amount_minor" = "booking_line_items"."unit_amount_minor" * "booking_line_items"."quantity"),
	CONSTRAINT "booking_line_items_money_nonnegative_check" CHECK("booking_line_items"."kind" = 'discount' or "booking_line_items"."unit_amount_minor" >= 0),
	CONSTRAINT "booking_line_items_discount_nonpositive_check" CHECK("booking_line_items"."kind" != 'discount' or "booking_line_items"."unit_amount_minor" <= 0)
);
--> statement-breakpoint
CREATE INDEX `booking_line_items_booking_idx` ON `booking_line_items` (`booking_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`guest_name` text NOT NULL,
	`address` text,
	`cellphone` text NOT NULL,
	`email` text,
	`pax` integer DEFAULT 0 NOT NULL,
	`check_in_date` text NOT NULL,
	`check_out_date` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`cancelled_at` text,
	CONSTRAINT "bookings_status_check" CHECK("bookings"."status" in ('tentative', 'confirmed', 'completed', 'cancelled')),
	CONSTRAINT "bookings_pax_nonnegative_check" CHECK("bookings"."pax" >= 0),
	CONSTRAINT "bookings_date_range_check" CHECK("bookings"."check_out_date" > "bookings"."check_in_date")
);
--> statement-breakpoint
CREATE INDEX `bookings_status_checkin_idx` ON `bookings` (`status`,`check_in_date`);--> statement-breakpoint
CREATE INDEX `bookings_guest_name_idx` ON `bookings` (`guest_name`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`paid_at` text NOT NULL,
	`method` text,
	`transaction_reference` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "payments_kind_check" CHECK("payments"."kind" in ('payment', 'refund')),
	CONSTRAINT "payments_amount_positive_check" CHECK("payments"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE INDEX `payments_booking_paid_at_idx` ON `payments` (`booking_id`,`paid_at`);