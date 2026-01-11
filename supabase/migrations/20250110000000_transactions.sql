-- Transactions Migration
-- Stores transactions fetched from Plaid

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,

  -- Plaid transaction identifiers
  plaid_transaction_id TEXT NOT NULL,

  -- Transaction details
  name TEXT NOT NULL,
  merchant_name TEXT,
  amount DECIMAL(12,2) NOT NULL, -- Positive = money out, Negative = money in
  currency_code TEXT DEFAULT 'USD',

  -- Categorization (Plaid provides these)
  category TEXT[], -- Array of category hierarchy
  category_id TEXT,
  primary_category TEXT, -- First level category for grouping

  -- Transaction metadata
  date DATE NOT NULL,
  datetime TIMESTAMPTZ,
  authorized_date DATE,
  pending BOOLEAN DEFAULT false,
  payment_channel TEXT, -- online, in store, other

  -- Location (optional)
  location_city TEXT,
  location_region TEXT,
  location_country TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_plaid_transaction UNIQUE (account_id, plaid_transaction_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(primary_category);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert/update transactions
DROP POLICY IF EXISTS "Service role can manage transactions" ON transactions;
CREATE POLICY "Service role can manage transactions" ON transactions
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();
