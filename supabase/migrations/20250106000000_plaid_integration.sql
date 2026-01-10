-- Plaid Integration Migration
-- Creates bank_connections table for storing Plaid bank connections

-- Create bank_connections table
CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plaid identifiers
  item_id TEXT NOT NULL UNIQUE,
  institution_id TEXT NOT NULL,

  -- Display information (safe to expose to frontend)
  institution_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT,

  -- Security: Access token stored encrypted, NEVER exposed to frontend
  access_token_encrypted TEXT NOT NULL,

  -- Mapping to Treasury banks (e.g., 'treasury_chase', 'treasury_bofa')
  treasury_bank_prefix TEXT,

  -- Connection status
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'disconnected', 'error', 'pending_reauth')),
  error_code TEXT,
  error_message TEXT,

  -- Account info
  accounts_count INTEGER DEFAULT 0,

  -- Timestamps
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_institution UNIQUE (user_id, institution_id)
);

-- Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_institution_id ON bank_connections(institution_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);
CREATE INDEX IF NOT EXISTS idx_bank_connections_treasury_prefix ON bank_connections(treasury_bank_prefix);

-- Enable RLS
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate to be idempotent)
DROP POLICY IF EXISTS "Users can view own bank connections" ON bank_connections;
CREATE POLICY "Users can view own bank connections" ON bank_connections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all bank connections" ON bank_connections;
CREATE POLICY "Admins can view all bank connections" ON bank_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create a secure view that excludes the encrypted access token for frontend queries
CREATE OR REPLACE VIEW bank_connections_safe AS
SELECT
  id,
  user_id,
  item_id,
  institution_id,
  institution_name,
  logo_url,
  primary_color,
  treasury_bank_prefix,
  status,
  error_code,
  error_message,
  accounts_count,
  linked_at,
  last_synced_at,
  updated_at,
  created_at
FROM bank_connections;

-- Grant access to the view for authenticated users
GRANT SELECT ON bank_connections_safe TO authenticated;

-- Create institution mapping table for matching Plaid institutions to Treasury banks
CREATE TABLE IF NOT EXISTS plaid_institution_mapping (
  plaid_institution_id TEXT PRIMARY KEY,
  treasury_bank_prefix TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on mapping table
ALTER TABLE plaid_institution_mapping ENABLE ROW LEVEL SECURITY;

-- Everyone can read institution mappings (idempotent)
DROP POLICY IF EXISTS "Anyone can view institution mappings" ON plaid_institution_mapping;
CREATE POLICY "Anyone can view institution mappings" ON plaid_institution_mapping
  FOR SELECT USING (true);

-- Seed common institution mappings
INSERT INTO plaid_institution_mapping (plaid_institution_id, treasury_bank_prefix, institution_name) VALUES
  ('ins_3', 'treasury_chase', 'JPMorgan Chase'),
  ('ins_4', 'treasury_bofa', 'Bank of America'),
  ('ins_5', 'treasury_wells', 'Wells Fargo'),
  ('ins_6', 'treasury_citi', 'Citi'),
  ('ins_7', 'treasury_usbank', 'US Bank'),
  ('ins_13', 'treasury_pnc', 'PNC Bank'),
  ('ins_31', 'treasury_truist', 'Truist'),
  ('ins_115609', 'treasury_bmo', 'BMO'),
  ('ins_9', 'treasury_citizens', 'Citizens Bank'),
  ('ins_10', 'treasury_hsbc', 'HSBC'),
  ('ins_10000', 'treasury_amex', 'American Express'),
  ('ins_28', 'treasury_navyfed', 'Navy Federal Credit Union'),
  ('ins_115616', 'treasury_penfed', 'PenFed Credit Union')
ON CONFLICT (plaid_institution_id) DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at (idempotent)
DROP TRIGGER IF EXISTS bank_connections_updated_at ON bank_connections;
CREATE TRIGGER bank_connections_updated_at
  BEFORE UPDATE ON bank_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_connections_updated_at();
