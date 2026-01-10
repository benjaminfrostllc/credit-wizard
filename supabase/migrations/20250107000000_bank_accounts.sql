-- Bank Accounts Migration
-- Stores individual bank accounts linked via Plaid

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,

  -- Plaid account identifiers
  plaid_account_id TEXT NOT NULL,

  -- Account info
  name TEXT NOT NULL,
  official_name TEXT,
  type TEXT NOT NULL, -- depository, credit, loan, investment, etc.
  subtype TEXT, -- checking, savings, credit card, etc.
  mask TEXT, -- Last 4 digits

  -- Balances (updated on sync)
  balance_available DECIMAL(12,2),
  balance_current DECIMAL(12,2),
  balance_limit DECIMAL(12,2),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_plaid_account UNIQUE (connection_id, plaid_account_id)
);

-- Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection_id ON bank_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_type ON bank_accounts(type);

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent)
DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
CREATE POLICY "Users can view own bank accounts" ON bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all bank accounts" ON bank_accounts;
CREATE POLICY "Admins can view all bank accounts" ON bank_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger to auto-update updated_at (idempotent)
DROP TRIGGER IF EXISTS bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_connections_updated_at();
