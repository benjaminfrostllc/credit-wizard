-- Member Management Schema Updates
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ADD NEW COLUMNS TO PROFILES TABLE
-- ============================================

DO $$
BEGIN
  -- Add phone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT;
  END IF;

  -- Add plan_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan_type TEXT DEFAULT 'basic' CHECK (plan_type IN ('basic', 'premium', 'vip'));
  END IF;

  -- Add client_id column (unique identifier like CW-2024-001)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN client_id TEXT UNIQUE;
  END IF;

  -- Add notes column (admin private notes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notes TEXT;
  END IF;

  -- Add invited_by column (tracks who invited the client)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN invited_by UUID REFERENCES profiles(id);
  END IF;
END $$;

-- ============================================
-- 2. CREATE CLIENT ID SEQUENCE
-- ============================================

-- Create sequence for client IDs if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'client_id_seq') THEN
    CREATE SEQUENCE client_id_seq START 1;
  END IF;
END $$;

-- ============================================
-- 3. FUNCTION TO GENERATE CLIENT ID
-- ============================================

CREATE OR REPLACE FUNCTION generate_client_id()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_client_id TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  seq_num := nextval('client_id_seq');
  new_client_id := 'CW-' || year_part || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN new_client_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. UPDATE HANDLE_NEW_USER TRIGGER
-- ============================================

-- Update the trigger function to auto-generate client_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone, plan_type, client_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'plan_type', 'basic'),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'client'
      THEN generate_client_id()
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. ADD RLS POLICY FOR ADMIN INSERT
-- ============================================

-- Allow admins to insert new profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to delete profiles (for cleanup)
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 6. FUNCTION TO GET CLIENTS WITH FILTERS
-- ============================================

CREATE OR REPLACE FUNCTION get_clients_filtered(
  p_search TEXT DEFAULT NULL,
  p_plan_type TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_min_progress INTEGER DEFAULT NULL,
  p_max_progress INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  plan_type TEXT,
  client_id TEXT,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  notes TEXT,
  progress_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.plan_type,
    p.client_id,
    p.role,
    COALESCE(p.is_active, true) as is_active,
    p.created_at,
    p.last_login,
    p.notes,
    COALESCE(
      (
        SELECT ROUND(
          (COUNT(CASE WHEN ct.completed THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
          1
        )
        FROM client_tasks ct
        WHERE ct.user_id = p.id
      ),
      0
    ) as progress_percent
  FROM profiles p
  WHERE p.role = 'client'
    AND (p_search IS NULL OR (
      p.full_name ILIKE '%' || p_search || '%' OR
      p.email ILIKE '%' || p_search || '%' OR
      p.client_id ILIKE '%' || p_search || '%' OR
      p.phone ILIKE '%' || p_search || '%'
    ))
    AND (p_plan_type IS NULL OR p.plan_type = p_plan_type)
    AND (p_is_active IS NULL OR COALESCE(p.is_active, true) = p_is_active)
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. FUNCTION TO GET CLIENT FULL DETAILS
-- ============================================

CREATE OR REPLACE FUNCTION get_client_full_details(p_user_id UUID)
RETURNS TABLE (
  -- Profile info
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  plan_type TEXT,
  client_id TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  notes TEXT,
  -- Progress info
  total_tasks BIGINT,
  completed_tasks BIGINT,
  overall_progress NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.plan_type,
    p.client_id,
    COALESCE(p.is_active, true),
    p.created_at,
    p.last_login,
    p.notes,
    (SELECT COUNT(*) FROM client_tasks ct WHERE ct.user_id = p.id)::BIGINT,
    (SELECT COUNT(*) FROM client_tasks ct WHERE ct.user_id = p.id AND ct.completed)::BIGINT,
    COALESCE(
      (
        SELECT ROUND(
          (COUNT(CASE WHEN ct.completed THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
          1
        )
        FROM client_tasks ct
        WHERE ct.user_id = p.id
      ),
      0
    )
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. FUNCTION FOR BULK DEACTIVATE
-- ============================================

CREATE OR REPLACE FUNCTION bulk_deactivate_clients(p_user_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE profiles
  SET is_active = false, updated_at = NOW()
  WHERE id = ANY(p_user_ids) AND role = 'client';

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. BACKFILL CLIENT IDS FOR EXISTING CLIENTS
-- ============================================

-- Generate client_id for existing clients that don't have one
UPDATE profiles
SET client_id = generate_client_id()
WHERE role = 'client' AND client_id IS NULL;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'Member management schema updated successfully!' as status;
