ALTER TABLE photos ADD COLUMN IF NOT EXISTS immich_asset_id TEXT;
CREATE INDEX IF NOT EXISTS idx_photos_immich ON photos(immich_asset_id) WHERE immich_asset_id IS NOT NULL;
