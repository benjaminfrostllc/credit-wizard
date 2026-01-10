-- Add connection_id column to credit_cards table to link manual cards to Plaid-connected banks
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_credit_cards_connection_id ON credit_cards(connection_id);
