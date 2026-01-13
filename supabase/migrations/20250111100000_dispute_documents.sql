CREATE TABLE IF NOT EXISTS dispute_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  case_id TEXT,
  document_type TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  status TEXT DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  notes TEXT
);

ALTER TABLE dispute_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dispute docs" ON dispute_documents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
