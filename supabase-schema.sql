-- Credit Wizard - FINANCIAL ASCENT Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. TASK TEMPLATES (master task list)
-- ============================================
CREATE TABLE IF NOT EXISTS task_templates (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tips TEXT,
  resources JSONB DEFAULT '[]'::jsonb,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  survey_condition JSONB,
  parent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_templates_section ON task_templates(section);

-- ============================================
-- 3. CLIENT TASKS (per-client state)
-- ============================================
CREATE TABLE IF NOT EXISTS client_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  task_template_id TEXT REFERENCES task_templates(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  comment TEXT,
  custom_title TEXT,
  custom_description TEXT,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, task_template_id)
);

CREATE INDEX IF NOT EXISTS idx_client_tasks_user ON client_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_template ON client_tasks(task_template_id);

-- ============================================
-- 4. SURVEY QUESTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS survey_questions (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_section ON survey_questions(section);

-- ============================================
-- 5. CLIENT SURVEY RESPONSES
-- ============================================
CREATE TABLE IF NOT EXISTS client_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id TEXT REFERENCES survey_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_client_surveys_user ON client_surveys(user_id);

-- ============================================
-- 6. UPDATE UPLOADED_FILES TABLE
-- ============================================
-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_files' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE uploaded_files ADD COLUMN user_id UUID REFERENCES profiles(id);
  END IF;
END $$;

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own tasks" ON client_tasks;
DROP POLICY IF EXISTS "Users can manage own tasks" ON client_tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON client_tasks;
DROP POLICY IF EXISTS "Users can view own surveys" ON client_surveys;
DROP POLICY IF EXISTS "Users can manage own surveys" ON client_surveys;
DROP POLICY IF EXISTS "Admins can view all surveys" ON client_surveys;
DROP POLICY IF EXISTS "Anyone can view task templates" ON task_templates;
DROP POLICY IF EXISTS "Admins can manage task templates" ON task_templates;
DROP POLICY IF EXISTS "Anyone can view survey questions" ON survey_questions;
DROP POLICY IF EXISTS "Admins can manage survey questions" ON survey_questions;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Client tasks policies
CREATE POLICY "Users can view own tasks" ON client_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tasks" ON client_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tasks" ON client_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Client surveys policies
CREATE POLICY "Users can view own surveys" ON client_surveys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own surveys" ON client_surveys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all surveys" ON client_surveys
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Task templates (read-only for everyone, admins can modify)
CREATE POLICY "Anyone can view task templates" ON task_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage task templates" ON task_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Survey questions (read-only for everyone, admins can modify)
CREATE POLICY "Anyone can view survey questions" ON survey_questions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage survey questions" ON survey_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to initialize tasks for a new user
CREATE OR REPLACE FUNCTION initialize_client_tasks(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO client_tasks (user_id, task_template_id)
  SELECT p_user_id, id FROM task_templates WHERE is_active = true
  ON CONFLICT (user_id, task_template_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user progress by section
CREATE OR REPLACE FUNCTION get_user_progress(p_user_id UUID)
RETURNS TABLE (
  section TEXT,
  total_tasks BIGINT,
  completed_tasks BIGINT,
  progress_percent NUMERIC
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
    ) as progress_percent
  FROM task_templates t
  LEFT JOIN client_tasks ct ON ct.task_template_id = t.id AND ct.user_id = p_user_id
  WHERE t.is_active = true AND (ct.is_hidden IS NULL OR ct.is_hidden = false)
  GROUP BY t.section;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
