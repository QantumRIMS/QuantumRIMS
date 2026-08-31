-- ============================================================
-- Announcements feature
-- ============================================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'workshops', 'seminars', 'events', 'deadlines',
    'funding_opportunities', 'general_notices'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  event_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff can read active announcements; all writes are service-role only
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read active announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ----------------------------------------------------------------

CREATE TABLE announcement_reads (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff can read and upsert their own row (no sensitive data)
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own read-receipt"
  ON announcement_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own read-receipt"
  ON announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own read-receipt"
  ON announcement_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------
-- Indexes
CREATE INDEX idx_announcements_category ON announcements(category);
CREATE INDEX idx_announcements_active_created ON announcements(is_active, created_at DESC);
