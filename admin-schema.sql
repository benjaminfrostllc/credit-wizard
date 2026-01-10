-- Credit Wizard Admin Features Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id), -- NULL means all clients
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'custom' CHECK (type IN ('announcement', 'reminder', 'congratulations', 'custom')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- 2. ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- ============================================
-- 3. UPDATE PROFILES TABLE - Add last_login
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_login TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================
-- 4. CLIENT SECTION SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS client_section_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  is_collapsed BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, section)
);

CREATE INDEX IF NOT EXISTS idx_section_settings_user ON client_section_settings(user_id);

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_section_settings ENABLE ROW LEVEL SECURITY;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    auth.uid() = recipient_id OR
    recipient_id IS NULL OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Admins can manage notifications" ON notifications;
CREATE POLICY "Admins can manage notifications" ON notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Activity log policies
DROP POLICY IF EXISTS "Users can view own activity" ON activity_log;
CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity" ON activity_log;
CREATE POLICY "Users can insert own activity" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all activity" ON activity_log;
CREATE POLICY "Admins can view all activity" ON activity_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Section settings policies
DROP POLICY IF EXISTS "Users can view own section settings" ON client_section_settings;
CREATE POLICY "Users can view own section settings" ON client_section_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own section settings" ON client_section_settings;
CREATE POLICY "Users can manage own section settings" ON client_section_settings
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all section settings" ON client_section_settings;
CREATE POLICY "Admins can manage all section settings" ON client_section_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to update last login
CREATE OR REPLACE FUNCTION update_last_login(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET last_login = NOW() WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_log (user_id, action, details)
  VALUES (p_user_id, p_action, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_clients BIGINT,
  active_clients BIGINT,
  logged_in_today BIGINT,
  logged_in_this_week BIGINT,
  avg_completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles WHERE role = 'client')::BIGINT as total_clients,
    (SELECT COUNT(*) FROM profiles WHERE role = 'client' AND is_active = true)::BIGINT as active_clients,
    (SELECT COUNT(*) FROM profiles WHERE role = 'client' AND last_login >= CURRENT_DATE)::BIGINT as logged_in_today,
    (SELECT COUNT(*) FROM profiles WHERE role = 'client' AND last_login >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as logged_in_this_week,
    COALESCE(
      (SELECT AVG(progress_percent) FROM (
        SELECT
          ct.user_id,
          (COUNT(CASE WHEN ct.completed THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100 as progress_percent
        FROM client_tasks ct
        JOIN profiles p ON p.id = ct.user_id
        WHERE p.role = 'client'
        GROUP BY ct.user_id
      ) sub),
      0
    )::NUMERIC as avg_completion_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client progress summary
CREATE OR REPLACE FUNCTION get_client_progress_summary(p_user_id UUID)
RETURNS TABLE (
  section TEXT,
  total_tasks BIGINT,
  completed_tasks BIGINT,
  progress_percent NUMERIC,
  last_completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.section,
    COUNT(*)::BIGINT as total_tasks,
    COUNT(CASE WHEN ct.completed THEN 1 END)::BIGINT as completed_tasks,
    ROUND(
      (COUNT(CASE WHEN ct.completed THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      1
    ) as progress_percent,
    MAX(ct.completed_at) as last_completed_at
  FROM task_templates t
  LEFT JOIN client_tasks ct ON ct.task_template_id = t.id AND ct.user_id = p_user_id
  WHERE t.is_active = true
  GROUP BY t.section
  ORDER BY t.section;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent activity feed
CREATE OR REPLACE FUNCTION get_recent_activity(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  action TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    p.full_name as user_name,
    p.email as user_email,
    a.action,
    a.details,
    a.created_at
  FROM activity_log a
  JOIN profiles p ON p.id = a.user_id
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success!
SELECT 'Admin schema created successfully!' as status;
