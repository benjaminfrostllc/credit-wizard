-- Add is_locked column to credit_cards table for card lock feature
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
