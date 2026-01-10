-- Add INSERT/DELETE policies for bank_accounts (service role bypasses RLS, but adding for completeness)
-- Also add policies for bank_connections writes

-- Bank accounts write policies
DROP POLICY IF EXISTS "Service role can insert bank accounts" ON bank_accounts;
CREATE POLICY "Service role can insert bank accounts" ON bank_accounts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete bank accounts" ON bank_accounts;
CREATE POLICY "Service role can delete bank accounts" ON bank_accounts
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Service role can update bank accounts" ON bank_accounts;
CREATE POLICY "Service role can update bank accounts" ON bank_accounts
  FOR UPDATE USING (true);

-- Bank connections write policies
DROP POLICY IF EXISTS "Service role can insert bank connections" ON bank_connections;
CREATE POLICY "Service role can insert bank connections" ON bank_connections
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update bank connections" ON bank_connections;
CREATE POLICY "Service role can update bank connections" ON bank_connections
  FOR UPDATE USING (true);
