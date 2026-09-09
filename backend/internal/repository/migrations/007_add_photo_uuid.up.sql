-- Add UUID column to photos for URL-based lookup
-- Drop if exists from failed previous attempt
ALTER TABLE photos DROP COLUMN IF EXISTS uuid;
ALTER TABLE photos ADD COLUMN uuid UUID;

-- Populate UUID from existing URL paths (cast text to uuid)
UPDATE photos SET uuid = CAST(SUBSTRING(url FROM 9) AS UUID) WHERE url LIKE '/photos/%' AND uuid IS NULL;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_photos_uuid ON photos(uuid);
