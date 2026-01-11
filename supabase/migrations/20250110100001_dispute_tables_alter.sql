-- Alter migration for dispute tables
-- Adds missing columns to existing tables

-- ============================================
-- ADD MISSING COLUMNS TO dispute_cases
-- ============================================
DO $$
BEGIN
  -- Add next_steps column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_cases' AND column_name = 'next_steps') THEN
    ALTER TABLE dispute_cases ADD COLUMN next_steps TEXT[];
  END IF;

  -- Add case_id column if not exists (human-readable ID)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_cases' AND column_name = 'case_id') THEN
    ALTER TABLE dispute_cases ADD COLUMN case_id TEXT;
  END IF;
END $$;

-- ============================================
-- ADD MISSING COLUMNS TO dispute_items
-- ============================================
DO $$
BEGIN
  -- Add creditor column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'creditor') THEN
    ALTER TABLE dispute_items ADD COLUMN creditor TEXT;
  END IF;

  -- Add account_number column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'account_number') THEN
    ALTER TABLE dispute_items ADD COLUMN account_number TEXT;
  END IF;

  -- Add account_type column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'account_type') THEN
    ALTER TABLE dispute_items ADD COLUMN account_type TEXT;
  END IF;

  -- Add balance column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'balance') THEN
    ALTER TABLE dispute_items ADD COLUMN balance DECIMAL(12,2);
  END IF;

  -- Add date_opened column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'date_opened') THEN
    ALTER TABLE dispute_items ADD COLUMN date_opened DATE;
  END IF;

  -- Add date_reported column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'date_reported') THEN
    ALTER TABLE dispute_items ADD COLUMN date_reported DATE;
  END IF;

  -- Add reason_code column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'reason_code') THEN
    ALTER TABLE dispute_items ADD COLUMN reason_code TEXT;
  END IF;

  -- Add dispute_reason column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'dispute_reason') THEN
    ALTER TABLE dispute_items ADD COLUMN dispute_reason TEXT;
  END IF;

  -- Add confidence_score column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'confidence_score') THEN
    ALTER TABLE dispute_items ADD COLUMN confidence_score INTEGER;
  END IF;

  -- Add bureau_response column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'bureau_response') THEN
    ALTER TABLE dispute_items ADD COLUMN bureau_response TEXT;
  END IF;

  -- Add response_date column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_items' AND column_name = 'response_date') THEN
    ALTER TABLE dispute_items ADD COLUMN response_date DATE;
  END IF;
END $$;

-- ============================================
-- ADD MISSING COLUMNS TO dispute_rounds
-- ============================================
DO $$
BEGIN
  -- Add round_type column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'round_type') THEN
    ALTER TABLE dispute_rounds ADD COLUMN round_type TEXT DEFAULT 'standard';
  END IF;

  -- Add outcome column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'outcome') THEN
    ALTER TABLE dispute_rounds ADD COLUMN outcome TEXT;
  END IF;

  -- Add letter_sent_at column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'letter_sent_at') THEN
    ALTER TABLE dispute_rounds ADD COLUMN letter_sent_at TIMESTAMPTZ;
  END IF;

  -- Add response_due_at column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'response_due_at') THEN
    ALTER TABLE dispute_rounds ADD COLUMN response_due_at TIMESTAMPTZ;
  END IF;

  -- Add response_received_at column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'response_received_at') THEN
    ALTER TABLE dispute_rounds ADD COLUMN response_received_at TIMESTAMPTZ;
  END IF;

  -- Add completed_at column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'completed_at') THEN
    ALTER TABLE dispute_rounds ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;

  -- Add letter_content column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'letter_content') THEN
    ALTER TABLE dispute_rounds ADD COLUMN letter_content TEXT;
  END IF;

  -- Add letter_file_path column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'letter_file_path') THEN
    ALTER TABLE dispute_rounds ADD COLUMN letter_file_path TEXT;
  END IF;

  -- Add tracking_number column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'tracking_number') THEN
    ALTER TABLE dispute_rounds ADD COLUMN tracking_number TEXT;
  END IF;

  -- Add response_summary column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'response_summary') THEN
    ALTER TABLE dispute_rounds ADD COLUMN response_summary TEXT;
  END IF;

  -- Add response_file_path column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispute_rounds' AND column_name = 'response_file_path') THEN
    ALTER TABLE dispute_rounds ADD COLUMN response_file_path TEXT;
  END IF;
END $$;

-- ============================================
-- CREATE INDEXES (idempotent)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_dispute_cases_user_id ON dispute_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_status ON dispute_cases(status);
CREATE INDEX IF NOT EXISTS idx_dispute_items_case_id ON dispute_items(case_id);
CREATE INDEX IF NOT EXISTS idx_dispute_items_bureau ON dispute_items(bureau);
CREATE INDEX IF NOT EXISTS idx_dispute_items_status ON dispute_items(status);
CREATE INDEX IF NOT EXISTS idx_dispute_rounds_case_id ON dispute_rounds(case_id);
CREATE INDEX IF NOT EXISTS idx_dispute_rounds_bureau ON dispute_rounds(bureau);
CREATE INDEX IF NOT EXISTS idx_dispute_rounds_status ON dispute_rounds(status);

-- ============================================
-- HELPER FUNCTIONS (create or replace)
-- ============================================

-- Generate next case ID
CREATE OR REPLACE FUNCTION generate_case_id()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
  new_case_id TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(case_id, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM dispute_cases
  WHERE case_id LIKE 'CW-' || year_str || '-%';

  new_case_id := 'CW-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN new_case_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate case progress
CREATE OR REPLACE FUNCTION calculate_case_progress(p_case_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_items INTEGER;
  deleted_items INTEGER;
  progress INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'deleted')
  INTO total_items, deleted_items
  FROM dispute_items
  WHERE case_id = p_case_id;

  IF total_items = 0 THEN
    RETURN 0;
  END IF;

  progress := ROUND((deleted_items::DECIMAL / total_items) * 100);
  RETURN progress;
END;
$$ LANGUAGE plpgsql;
