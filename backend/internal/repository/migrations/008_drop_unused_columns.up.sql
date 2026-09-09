-- Cleanup: drop unused columns

-- events: cover_image_url no longer used (cover upload removed)
ALTER TABLE events DROP COLUMN IF EXISTS cover_image_url;

-- businesses: logo_url not used by frontend
ALTER TABLE businesses DROP COLUMN IF EXISTS logo_url;

-- users: updated_at not used
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;

-- guests: last_active_at updated but never read meaningfully
ALTER TABLE guests DROP COLUMN IF EXISTS last_active_at;
