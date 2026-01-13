-- Seed data for the budgeting engine
-- Uses the earliest profile record as the sample user.

WITH target_user AS (
  SELECT id FROM profiles ORDER BY created_at LIMIT 1
),
month_record AS (
  INSERT INTO budget_months (user_id, month, income_total, assigned_total)
  SELECT id, date_trunc('month', NOW())::date, 4000, 4000
  FROM target_user
  ON CONFLICT (user_id, month)
  DO UPDATE SET income_total = 4000, assigned_total = 4000
  RETURNING id, user_id
),
category_seed AS (
  INSERT INTO budget_categories (user_id, name, plaid_primary_category, rollover_enabled, sort_order)
  SELECT id, 'Housing', 'Payment', true, 1 FROM target_user
  UNION ALL SELECT id, 'Utilities', 'Service', false, 2 FROM target_user
  UNION ALL SELECT id, 'Groceries', 'Food and Drink', false, 3 FROM target_user
  UNION ALL SELECT id, 'Transportation', 'Travel', false, 4 FROM target_user
  UNION ALL SELECT id, 'Health', 'Healthcare', true, 5 FROM target_user
  UNION ALL SELECT id, 'Shopping', 'Shops', false, 6 FROM target_user
  UNION ALL SELECT id, 'Entertainment', 'Recreation', false, 7 FROM target_user
  UNION ALL SELECT id, 'Savings', NULL, true, 8 FROM target_user
  ON CONFLICT (user_id, name)
  DO UPDATE SET
    plaid_primary_category = EXCLUDED.plaid_primary_category,
    rollover_enabled = EXCLUDED.rollover_enabled,
    sort_order = EXCLUDED.sort_order
  RETURNING id, user_id, name
)
INSERT INTO envelope_allocations (budget_month_id, category_id, assigned_amount, spent_amount, available_amount)
SELECT
  month_record.id,
  category_seed.id,
  CASE category_seed.name
    WHEN 'Housing' THEN 1500
    WHEN 'Utilities' THEN 300
    WHEN 'Groceries' THEN 600
    WHEN 'Transportation' THEN 250
    WHEN 'Health' THEN 200
    WHEN 'Shopping' THEN 350
    WHEN 'Entertainment' THEN 200
    WHEN 'Savings' THEN 600
    ELSE 0
  END AS assigned_amount,
  CASE category_seed.name
    WHEN 'Housing' THEN 1400
    WHEN 'Utilities' THEN 280
    WHEN 'Groceries' THEN 420
    WHEN 'Transportation' THEN 180
    WHEN 'Health' THEN 150
    WHEN 'Shopping' THEN 200
    WHEN 'Entertainment' THEN 150
    WHEN 'Savings' THEN 0
    ELSE 0
  END AS spent_amount,
  CASE category_seed.name
    WHEN 'Housing' THEN 100
    WHEN 'Utilities' THEN 20
    WHEN 'Groceries' THEN 180
    WHEN 'Transportation' THEN 70
    WHEN 'Health' THEN 50
    WHEN 'Shopping' THEN 150
    WHEN 'Entertainment' THEN 50
    WHEN 'Savings' THEN 600
    ELSE 0
  END AS available_amount
FROM category_seed
CROSS JOIN month_record
ON CONFLICT (budget_month_id, category_id)
DO UPDATE SET
  assigned_amount = EXCLUDED.assigned_amount,
  spent_amount = EXCLUDED.spent_amount,
  available_amount = EXCLUDED.available_amount;
