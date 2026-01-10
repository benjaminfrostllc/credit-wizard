-- Add connection_id to belongings table for grouping cards by bank
ALTER TABLE belongings ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_belongings_connection_id ON belongings(connection_id);
