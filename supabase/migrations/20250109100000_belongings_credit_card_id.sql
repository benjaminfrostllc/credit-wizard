-- Add credit_card_id column to belongings table for manual credit cards
ALTER TABLE belongings ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_belongings_credit_card_id ON belongings(credit_card_id);
