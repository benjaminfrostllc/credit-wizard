-- Budgeting Migration
-- Adds zero-based budgeting tables

CREATE TABLE IF NOT EXISTS budget_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  income_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  assigned_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  remaining DECIMAL(12,2) GENERATED ALWAYS AS (income_total - assigned_total) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_budget_months_user_month ON budget_months(user_id, month);

CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plaid_primary_category TEXT,
  rollover_enabled BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_user ON budget_categories(user_id);

CREATE TABLE IF NOT EXISTS envelope_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_month_id UUID NOT NULL REFERENCES budget_months(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
  assigned_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  spent_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  available_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(budget_month_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_envelope_allocations_month ON envelope_allocations(budget_month_id);
CREATE INDEX IF NOT EXISTS idx_envelope_allocations_category ON envelope_allocations(category_id);

-- Enable RLS
ALTER TABLE budget_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE envelope_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: budget_months
DROP POLICY IF EXISTS "Users can view own budget months" ON budget_months;
CREATE POLICY "Users can view own budget months" ON budget_months
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own budget months" ON budget_months;
CREATE POLICY "Users can manage own budget months" ON budget_months
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all budget months" ON budget_months;
CREATE POLICY "Admins can view all budget months" ON budget_months
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies: budget_categories
DROP POLICY IF EXISTS "Users can view own budget categories" ON budget_categories;
CREATE POLICY "Users can view own budget categories" ON budget_categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own budget categories" ON budget_categories;
CREATE POLICY "Users can manage own budget categories" ON budget_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all budget categories" ON budget_categories;
CREATE POLICY "Admins can view all budget categories" ON budget_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies: envelope_allocations
DROP POLICY IF EXISTS "Users can view own envelope allocations" ON envelope_allocations;
CREATE POLICY "Users can view own envelope allocations" ON envelope_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budget_months
      WHERE budget_months.id = envelope_allocations.budget_month_id
      AND budget_months.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own envelope allocations" ON envelope_allocations;
CREATE POLICY "Users can manage own envelope allocations" ON envelope_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM budget_months
      WHERE budget_months.id = envelope_allocations.budget_month_id
      AND budget_months.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_months
      WHERE budget_months.id = envelope_allocations.budget_month_id
      AND budget_months.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all envelope allocations" ON envelope_allocations;
CREATE POLICY "Admins can view all envelope allocations" ON envelope_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS budget_months_updated_at ON budget_months;
CREATE TRIGGER budget_months_updated_at
  BEFORE UPDATE ON budget_months
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();

DROP TRIGGER IF EXISTS budget_categories_updated_at ON budget_categories;
CREATE TRIGGER budget_categories_updated_at
  BEFORE UPDATE ON budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();

DROP TRIGGER IF EXISTS envelope_allocations_updated_at ON envelope_allocations;
CREATE TRIGGER envelope_allocations_updated_at
  BEFORE UPDATE ON envelope_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();
