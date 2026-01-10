-- Business Intelligence Migration
-- Adds revenue tracking and Plaid API usage tracking

-- ============================================
-- 1. Add revenue fields to profiles
-- ============================================

-- Add revenue and plan_price fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan_price DECIMAL(10,2) DEFAULT 0;

-- Set default plan prices based on plan_type
UPDATE profiles SET plan_price =
  CASE plan_type
    WHEN 'basic' THEN 97.00
    WHEN 'premium' THEN 197.00
    WHEN 'vip' THEN 497.00
    ELSE 0
  END
WHERE plan_price = 0 OR plan_price IS NULL;

-- ============================================
-- 2. Create Plaid API usage tracking table
-- ============================================

CREATE TABLE IF NOT EXISTS plaid_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  cost DECIMAL(10,4) NOT NULL,
  request_id TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_plaid_api_usage_user_id ON plaid_api_usage(user_id);
CREATE INDEX idx_plaid_api_usage_created_at ON plaid_api_usage(created_at);
CREATE INDEX idx_plaid_api_usage_endpoint ON plaid_api_usage(endpoint);

-- Enable RLS
ALTER TABLE plaid_api_usage ENABLE ROW LEVEL SECURITY;

-- Only admins can view/insert plaid usage
CREATE POLICY "Admins can view all plaid usage" ON plaid_api_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert plaid usage" ON plaid_api_usage
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 3. Plaid cost reference table
-- ============================================

CREATE TABLE IF NOT EXISTS plaid_endpoint_costs (
  endpoint TEXT PRIMARY KEY,
  cost_per_call DECIMAL(10,4) NOT NULL,
  cost_type TEXT DEFAULT 'per_call', -- 'per_call' or 'monthly'
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Plaid pricing
INSERT INTO plaid_endpoint_costs (endpoint, cost_per_call, cost_type, description) VALUES
  ('auth', 1.50, 'per_call', 'Bank account and routing number verification'),
  ('identity', 1.50, 'per_call', 'Account holder identity verification'),
  ('balance', 0.10, 'per_call', 'Real-time balance check'),
  ('transactions', 0.30, 'monthly', 'Transaction history access'),
  ('liabilities', 0.20, 'monthly', 'Credit card and loan data'),
  ('assets', 2.99, 'per_call', 'Asset verification report'),
  ('income', 6.00, 'per_call', 'Income verification'),
  ('statements', 0.50, 'per_call', 'Bank statement PDF retrieval'),
  ('link_token_create', 0.00, 'per_call', 'Link initialization'),
  ('item_public_token_exchange', 0.00, 'per_call', 'Token exchange')
ON CONFLICT (endpoint) DO NOTHING;

-- Enable RLS
ALTER TABLE plaid_endpoint_costs ENABLE ROW LEVEL SECURITY;

-- Anyone can read costs
CREATE POLICY "Anyone can view plaid costs" ON plaid_endpoint_costs
  FOR SELECT USING (true);

-- ============================================
-- 4. Analytics Views and Functions
-- ============================================

-- Revenue summary view
CREATE OR REPLACE VIEW revenue_summary AS
SELECT
  COUNT(*) as total_clients,
  COUNT(*) FILTER (WHERE is_active = true) as active_clients,
  COALESCE(SUM(revenue), 0) as total_revenue,
  COALESCE(SUM(plan_price), 0) as monthly_recurring_revenue,
  COALESCE(AVG(revenue) FILTER (WHERE revenue > 0), 0) as avg_revenue_per_paying_client,
  COALESCE(AVG(plan_price), 0) as avg_plan_price
FROM profiles
WHERE role = 'client';

-- Monthly revenue breakdown
CREATE OR REPLACE FUNCTION get_monthly_revenue(months_back INTEGER DEFAULT 6)
RETURNS TABLE (
  month TEXT,
  revenue DECIMAL,
  new_clients BIGINT,
  churned_clients BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', NOW()) - (months_back - 1 || ' months')::INTERVAL,
      date_trunc('month', NOW()),
      '1 month'::INTERVAL
    )::DATE as month_start
  )
  SELECT
    TO_CHAR(m.month_start, 'Mon YYYY') as month,
    COALESCE(SUM(p.plan_price), 0)::DECIMAL as revenue,
    COUNT(p.id) FILTER (WHERE date_trunc('month', p.created_at) = m.month_start) as new_clients,
    0::BIGINT as churned_clients -- Placeholder, would need is_active history
  FROM months m
  LEFT JOIN profiles p ON p.role = 'client'
    AND p.created_at <= m.month_start + INTERVAL '1 month'
    AND p.is_active = true
  GROUP BY m.month_start
  ORDER BY m.month_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Plaid costs summary
CREATE OR REPLACE FUNCTION get_plaid_costs_summary(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  endpoint TEXT,
  call_count BIGINT,
  total_cost DECIMAL,
  avg_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.endpoint,
    COUNT(*) as call_count,
    SUM(u.cost) as total_cost,
    AVG(u.cost) as avg_cost
  FROM plaid_api_usage u
  WHERE u.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY u.endpoint
  ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Monthly Plaid costs
CREATE OR REPLACE FUNCTION get_monthly_plaid_costs(months_back INTEGER DEFAULT 6)
RETURNS TABLE (
  month TEXT,
  total_cost DECIMAL,
  call_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', NOW()) - (months_back - 1 || ' months')::INTERVAL,
      date_trunc('month', NOW()),
      '1 month'::INTERVAL
    )::DATE as month_start
  )
  SELECT
    TO_CHAR(m.month_start, 'Mon YYYY') as month,
    COALESCE(SUM(u.cost), 0)::DECIMAL as total_cost,
    COALESCE(COUNT(u.id), 0)::BIGINT as call_count
  FROM months m
  LEFT JOIN plaid_api_usage u ON date_trunc('month', u.created_at) = m.month_start
  GROUP BY m.month_start
  ORDER BY m.month_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Client profitability
CREATE OR REPLACE FUNCTION get_client_profitability()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  revenue DECIMAL,
  plaid_costs DECIMAL,
  profit DECIMAL,
  profit_margin DECIMAL,
  plan_type TEXT,
  progress NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.full_name,
    p.email,
    COALESCE(p.revenue, 0)::DECIMAL as revenue,
    COALESCE(
      (SELECT SUM(cost) FROM plaid_api_usage WHERE plaid_api_usage.user_id = p.id),
      0
    )::DECIMAL as plaid_costs,
    (COALESCE(p.revenue, 0) - COALESCE(
      (SELECT SUM(cost) FROM plaid_api_usage WHERE plaid_api_usage.user_id = p.id),
      0
    ))::DECIMAL as profit,
    CASE
      WHEN COALESCE(p.revenue, 0) > 0 THEN
        ((COALESCE(p.revenue, 0) - COALESCE(
          (SELECT SUM(cost) FROM plaid_api_usage WHERE plaid_api_usage.user_id = p.id),
          0
        )) / p.revenue * 100)::DECIMAL
      ELSE 0
    END as profit_margin,
    p.plan_type,
    COALESCE(
      (SELECT AVG(progress_percent) FROM get_user_progress(p.id)),
      0
    ) as progress
  FROM profiles p
  WHERE p.role = 'client'
  ORDER BY profit DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Section completion analytics
CREATE OR REPLACE FUNCTION get_section_analytics()
RETURNS TABLE (
  section TEXT,
  total_clients BIGINT,
  clients_started BIGINT,
  clients_completed BIGINT,
  avg_completion_rate DECIMAL,
  avg_days_to_complete DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH section_stats AS (
    SELECT
      t.section,
      ct.user_id,
      COUNT(*) as total_tasks,
      COUNT(*) FILTER (WHERE ct.completed = true) as completed_tasks,
      MIN(ct.completed_at) as first_completion,
      MAX(ct.completed_at) as last_completion
    FROM client_tasks ct
    JOIN task_templates t ON ct.task_template_id = t.id
    GROUP BY t.section, ct.user_id
  )
  SELECT
    s.section,
    COUNT(DISTINCT s.user_id) as total_clients,
    COUNT(DISTINCT s.user_id) FILTER (WHERE s.completed_tasks > 0) as clients_started,
    COUNT(DISTINCT s.user_id) FILTER (WHERE s.completed_tasks = s.total_tasks) as clients_completed,
    AVG(s.completed_tasks::DECIMAL / NULLIF(s.total_tasks, 0) * 100) as avg_completion_rate,
    AVG(
      CASE
        WHEN s.first_completion IS NOT NULL AND s.last_completion IS NOT NULL
        THEN EXTRACT(EPOCH FROM (s.last_completion - s.first_completion)) / 86400
        ELSE NULL
      END
    ) as avg_days_to_complete
  FROM section_stats s
  GROUP BY s.section
  ORDER BY s.section;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clients at risk (high cost, low progress)
CREATE OR REPLACE FUNCTION get_clients_at_risk(cost_threshold DECIMAL DEFAULT 5.00, progress_threshold INTEGER DEFAULT 25)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  plaid_costs DECIMAL,
  progress NUMERIC,
  days_since_login INTEGER,
  risk_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.full_name,
    p.email,
    COALESCE(
      (SELECT SUM(cost) FROM plaid_api_usage WHERE plaid_api_usage.user_id = p.id),
      0
    )::DECIMAL as plaid_costs,
    COALESCE(
      (SELECT AVG(progress_percent) FROM get_user_progress(p.id)),
      0
    ) as progress,
    COALESCE(
      EXTRACT(DAY FROM NOW() - p.last_login)::INTEGER,
      999
    ) as days_since_login,
    -- Risk score: higher is worse
    (
      CASE WHEN COALESCE(
        (SELECT SUM(cost) FROM plaid_api_usage WHERE plaid_api_usage.user_id = p.id),
        0
      ) > cost_threshold THEN 30 ELSE 0 END +
      CASE WHEN COALESCE(
        (SELECT AVG(progress_percent) FROM get_user_progress(p.id)),
        0
      ) < progress_threshold THEN 40 ELSE 0 END +
      CASE WHEN COALESCE(EXTRACT(DAY FROM NOW() - p.last_login), 999) > 14 THEN 30 ELSE 0 END
    )::INTEGER as risk_score
  FROM profiles p
  WHERE p.role = 'client'
    AND p.is_active = true
    AND (
      COALESCE(
        (SELECT SUM(cost) FROM plaid_api_usage WHERE plaid_api_usage.user_id = p.id),
        0
      ) > cost_threshold
      OR COALESCE(
        (SELECT AVG(progress_percent) FROM get_user_progress(p.id)),
        0
      ) < progress_threshold
    )
  ORDER BY risk_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Business intelligence dashboard stats
CREATE OR REPLACE FUNCTION get_bi_dashboard_stats()
RETURNS TABLE (
  total_clients BIGINT,
  active_this_week BIGINT,
  total_revenue DECIMAL,
  revenue_this_month DECIMAL,
  plaid_costs_this_month DECIMAL,
  net_profit_this_month DECIMAL,
  avg_client_value DECIMAL,
  monthly_recurring_revenue DECIMAL
) AS $$
DECLARE
  month_start DATE := date_trunc('month', NOW())::DATE;
  week_start DATE := date_trunc('week', NOW())::DATE;
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles WHERE role = 'client')::BIGINT as total_clients,
    (SELECT COUNT(*) FROM profiles WHERE role = 'client' AND last_login >= week_start)::BIGINT as active_this_week,
    (SELECT COALESCE(SUM(revenue), 0) FROM profiles WHERE role = 'client')::DECIMAL as total_revenue,
    (SELECT COALESCE(SUM(revenue), 0) FROM profiles WHERE role = 'client' AND created_at >= month_start)::DECIMAL as revenue_this_month,
    (SELECT COALESCE(SUM(cost), 0) FROM plaid_api_usage WHERE created_at >= month_start)::DECIMAL as plaid_costs_this_month,
    (
      (SELECT COALESCE(SUM(plan_price), 0) FROM profiles WHERE role = 'client' AND is_active = true) -
      (SELECT COALESCE(SUM(cost), 0) FROM plaid_api_usage WHERE created_at >= month_start)
    )::DECIMAL as net_profit_this_month,
    (SELECT COALESCE(AVG(revenue), 0) FROM profiles WHERE role = 'client' AND revenue > 0)::DECIMAL as avg_client_value,
    (SELECT COALESCE(SUM(plan_price), 0) FROM profiles WHERE role = 'client' AND is_active = true)::DECIMAL as monthly_recurring_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
