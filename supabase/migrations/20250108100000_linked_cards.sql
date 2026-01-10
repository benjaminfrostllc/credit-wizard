-- Create linked_cards table for cards linked to Plaid accounts
CREATE TABLE IF NOT EXISTS linked_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  last_four TEXT,
  card_type TEXT NOT NULL CHECK (card_type IN ('debit', 'credit')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, account_id)
);

-- Add linked_account_id to belongings table
ALTER TABLE belongings ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE linked_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies for linked_cards
DROP POLICY IF EXISTS "Users can view own linked cards" ON linked_cards;
CREATE POLICY "Users can view own linked cards" ON linked_cards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own linked cards" ON linked_cards;
CREATE POLICY "Users can insert own linked cards" ON linked_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own linked cards" ON linked_cards;
CREATE POLICY "Users can update own linked cards" ON linked_cards
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own linked cards" ON linked_cards;
CREATE POLICY "Users can delete own linked cards" ON linked_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_linked_cards_user_id ON linked_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_cards_account_id ON linked_cards(account_id);
CREATE INDEX IF NOT EXISTS idx_belongings_linked_account_id ON belongings(linked_account_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_linked_cards_updated_at ON linked_cards;
CREATE TRIGGER update_linked_cards_updated_at
  BEFORE UPDATE ON linked_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_connections_updated_at();
