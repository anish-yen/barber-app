-- Add priority_level column to waitlist_entries
ALTER TABLE waitlist_entries 
ADD COLUMN IF NOT EXISTS priority_level INTEGER NOT NULL DEFAULT 0;

-- Add check constraint: priority_level >= 0
ALTER TABLE waitlist_entries
ADD CONSTRAINT IF NOT EXISTS check_priority_level_nonnegative 
CHECK (priority_level >= 0);

-- Add index for priority-based ordering (optimizes queue queries)
CREATE INDEX IF NOT EXISTS idx_waitlist_priority_joined 
ON waitlist_entries(priority_level DESC, joined_at ASC) 
WHERE served_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN waitlist_entries.priority_level IS 
'Priority level (0 = normal, higher = priority). Higher priority served first. Barber-controlled only.';

