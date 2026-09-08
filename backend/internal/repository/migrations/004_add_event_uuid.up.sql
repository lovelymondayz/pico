-- Add UUID column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() UNIQUE;

-- Update existing events with UUIDs
UPDATE events SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make UUID NOT NULL after populating
ALTER TABLE events ALTER COLUMN uuid SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_events_uuid ON events(uuid);
