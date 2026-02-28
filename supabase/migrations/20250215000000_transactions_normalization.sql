-- Transactions normalization updates
-- Adds requested fields + accounts view for compatibility

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS category_hint TEXT,
  ADD COLUMN IF NOT EXISTS raw_json JSONB;

-- Provide an accounts view backed by bank_accounts for normalized access
CREATE OR REPLACE VIEW accounts AS
  SELECT
    id,
    user_id,
    connection_id,
    plaid_account_id,
    name,
    official_name,
    type,
    subtype,
    mask,
    balance_available,
    balance_current,
    balance_limit,
    created_at,
    updated_at
  FROM bank_accounts;
