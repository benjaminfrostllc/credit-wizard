-- Seed data for Disputes page testing
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Get your user ID by running this first:
-- SELECT id, email FROM auth.users LIMIT 5;

-- Step 2: Replace 'YOUR_USER_ID_HERE' below with your actual user UUID
-- Then run the entire script

DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID_HERE'; -- REPLACE THIS!
  v_case_id UUID;
BEGIN
  -- Validate user exists
  IF v_user_id = 'YOUR_USER_ID_HERE'::UUID THEN
    RAISE EXCEPTION 'Please replace YOUR_USER_ID_HERE with an actual user UUID from auth.users';
  END IF;

  RAISE NOTICE 'Creating dispute data for user: %', v_user_id;

  -- Delete existing test data for this user (clean slate)
  DELETE FROM dispute_rounds WHERE case_id IN (SELECT id FROM dispute_cases WHERE user_id = v_user_id);
  DELETE FROM dispute_items WHERE case_id IN (SELECT id FROM dispute_cases WHERE user_id = v_user_id);
  DELETE FROM dispute_cases WHERE user_id = v_user_id;

  -- Create Dispute Case
  INSERT INTO dispute_cases (
    id, user_id, case_id, status, progress_percent, ai_summary, next_steps, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'CW-2025-0001',
    'active',
    29,
    'Your credit report shows 7 negative items across all three bureaus. We''ve identified strong dispute angles for 5 items based on FCRA violations and reporting inaccuracies. The Capital One collection has the highest removal probability (92%) due to missing validation documentation. Two medical collections may qualify for removal under the new medical debt reporting rules.',
    ARRAY[
      'Review Round 1 responses from Experian (due in 12 days)',
      'Prepare Method of Verification letters for verified items',
      'Upload any supporting documents for the Capital One dispute',
      'Monitor mail for TransUnion response'
    ],
    NOW(),
    NOW()
  )
  RETURNING id INTO v_case_id;

  RAISE NOTICE 'Created case: %', v_case_id;

  -- Create Dispute Items (7 total)

  -- Experian Items
  INSERT INTO dispute_items (case_id, bureau, creditor, account_number, account_type, balance, status, reason_code, confidence_score, date_reported)
  VALUES
    (v_case_id, 'EX', 'Capital One', '4847', 'collection', 2847.00, 'disputed', 'not_mine', 92, '2024-03-15'),
    (v_case_id, 'EX', 'Midland Credit', '9923', 'collection', 1256.00, 'deleted', 'debt_too_old', 88, '2023-11-20');

  -- Equifax Items
  INSERT INTO dispute_items (case_id, bureau, creditor, account_number, account_type, balance, status, reason_code, confidence_score, date_reported)
  VALUES
    (v_case_id, 'EQ', 'Portfolio Recovery', '3321', 'collection', 534.00, 'verified', 'inaccurate_balance', 65, '2024-01-10'),
    (v_case_id, 'EQ', 'Medical Data Systems', '7744', 'medical', 890.00, 'disputed', 'hipaa_violation', 78, '2024-02-28');

  -- TransUnion Items
  INSERT INTO dispute_items (case_id, bureau, creditor, account_number, account_type, balance, status, reason_code, confidence_score, date_reported)
  VALUES
    (v_case_id, 'TU', 'Synchrony Bank', '5567', 'charge_off', 1823.00, 'escalated', 'paid_not_updated', 71, '2023-09-05'),
    (v_case_id, 'TU', 'LVNV Funding', '2289', 'collection', 445.00, 'deleted', 'no_valid_contract', 85, '2024-04-01'),
    (v_case_id, 'TU', 'Discover', '8834', 'late_payment', 0.00, 'disputed', 'never_late', 80, '2023-12-15');

  RAISE NOTICE 'Created 7 dispute items';

  -- Create Dispute Rounds (5 total)

  -- Round 1 - Experian (Complete - Deleted)
  INSERT INTO dispute_rounds (case_id, round_number, round_type, bureau, status, outcome, started_at, letter_sent_at, response_due_at, response_received_at, completed_at, tracking_number)
  VALUES (v_case_id, 1, 'standard', 'EX', 'complete', 'deleted', NOW() - INTERVAL '45 days', NOW() - INTERVAL '43 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', '9400111899223847562901');

  -- Round 1 - Equifax (Awaiting Response)
  INSERT INTO dispute_rounds (case_id, round_number, round_type, bureau, status, outcome, started_at, letter_sent_at, response_due_at, tracking_number)
  VALUES (v_case_id, 1, 'standard', 'EQ', 'awaiting_response', 'pending', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', NOW() + INTERVAL '12 days', '9400111899223847562918');

  -- Round 1 - TransUnion (Complete - Verified)
  INSERT INTO dispute_rounds (case_id, round_number, round_type, bureau, status, outcome, started_at, letter_sent_at, response_due_at, response_received_at, completed_at, tracking_number, response_summary)
  VALUES (v_case_id, 1, 'standard', 'TU', 'complete', 'verified', NOW() - INTERVAL '40 days', NOW() - INTERVAL '38 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', '9400111899223847562925', 'TransUnion verified the Synchrony account. Proceeding with Method of Verification.');

  -- Round 2 - TransUnion (MOV - Sent)
  INSERT INTO dispute_rounds (case_id, round_number, round_type, bureau, status, outcome, started_at, letter_sent_at, response_due_at, tracking_number)
  VALUES (v_case_id, 2, 'method_of_verification', 'TU', 'sent', 'pending', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', '9400111899223847562932');

  -- Round 2 - Experian (Direct Creditor - Draft)
  INSERT INTO dispute_rounds (case_id, round_number, round_type, bureau, status, started_at)
  VALUES (v_case_id, 2, 'direct_creditor', 'EX', 'draft', NOW() - INTERVAL '2 days');

  RAISE NOTICE 'Created 5 dispute rounds';

  -- Recalculate progress (2 deleted out of 7 = 29%)
  UPDATE dispute_cases SET progress_percent = 29 WHERE id = v_case_id;

  RAISE NOTICE 'Seed complete! Case ID: %', v_case_id;
END $$;

-- Verify the data was created
SELECT 'Cases:' as type, COUNT(*) as count FROM dispute_cases
UNION ALL
SELECT 'Items:', COUNT(*) FROM dispute_items
UNION ALL
SELECT 'Rounds:', COUNT(*) FROM dispute_rounds;
