-- Alert events stream for internal notifications and webhook delivery

CREATE TABLE IF NOT EXISTS alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message_template_key TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivery_error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alert_events
  ADD CONSTRAINT alert_events_event_type_check
  CHECK (event_type IN (
    'budget.threshold_reached',
    'spend.unusual',
    'bill.upcoming',
    'balance.low',
    'credit.utilization_high',
    'goal.off_track'
  ));

ALTER TABLE alert_events
  ADD CONSTRAINT alert_events_severity_check
  CHECK (severity IN ('info', 'warning', 'critical'));

CREATE INDEX IF NOT EXISTS idx_alert_events_user_id ON alert_events(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_event_type ON alert_events(event_type);
CREATE INDEX IF NOT EXISTS idx_alert_events_created_at ON alert_events(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_events_delivery_status ON alert_events(delivery_status);

ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage alert events" ON alert_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view own alert events" ON alert_events
  FOR SELECT
  USING (auth.uid() = user_id);
