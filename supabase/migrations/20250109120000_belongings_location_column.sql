-- Add location column to belongings table if it doesn't exist
-- This column tracks whether an item is in 'vault' or 'carry'
ALTER TABLE belongings ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'vault' CHECK (location IN ('vault', 'carry'));

-- Create index for faster filtering by location
CREATE INDEX IF NOT EXISTS idx_belongings_location ON belongings(location);
