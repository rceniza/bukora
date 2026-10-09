ALTER TABLE bookings ADD COLUMN confirmation_deposit_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (confirmation_deposit_amount_minor >= 0);
