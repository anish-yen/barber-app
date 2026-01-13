-- Create waitlist_entries table (without position column - computed dynamically)
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count >= 1 AND guest_count <= 2),
  notification_sent BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  served_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure one active entry per customer
  CONSTRAINT unique_active_customer UNIQUE NULLS NOT DISTINCT (customer_id, served_at)
);

-- Index for ordering by joined_at (for position calculation)
CREATE INDEX IF NOT EXISTS idx_waitlist_joined_at ON waitlist_entries(joined_at) WHERE served_at IS NULL;

-- Index for customer lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_customer ON waitlist_entries(customer_id);

-- Enable RLS
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers can read their own entries
CREATE POLICY "Customers can read own entries"
  ON waitlist_entries FOR SELECT
  USING (auth.uid() = customer_id);

-- Customers can create their own entries
CREATE POLICY "Customers can create own entries"
  ON waitlist_entries FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Barber can read all entries (for dashboard)
CREATE POLICY "Barber can read all entries"
  ON waitlist_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'barber'
    )
  );

-- Barber can update entries (for serving customers)
CREATE POLICY "Barber can update entries"
  ON waitlist_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'barber'
    )
  );

