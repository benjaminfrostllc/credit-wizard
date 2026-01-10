-- Add RLS policies for belongings table to allow authenticated users to manage their own belongings

-- Enable RLS if not already enabled
ALTER TABLE belongings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own belongings" ON belongings;
DROP POLICY IF EXISTS "Users can insert their own belongings" ON belongings;
DROP POLICY IF EXISTS "Users can update their own belongings" ON belongings;
DROP POLICY IF EXISTS "Users can delete their own belongings" ON belongings;

-- Create policies
CREATE POLICY "Users can view their own belongings"
  ON belongings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own belongings"
  ON belongings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own belongings"
  ON belongings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own belongings"
  ON belongings FOR DELETE
  USING (auth.uid() = user_id);
