-- Backfill Immich album IDs for existing events
-- These albums were created manually via Immich API
-- New events will get albums automatically via CreateAlbum()

UPDATE events SET immich_album_id = 'c658d4aa-8039-4525-b973-68b9c7396753' WHERE id = 1 AND immich_album_id IS NULL;
UPDATE events SET immich_album_id = '5a7e1866-4a83-4667-8aa7-fcb51576ba8b' WHERE id = 2 AND immich_album_id IS NULL;
UPDATE events SET immich_album_id = 'b312e4d2-8fdf-4f6d-91057ef9613f' WHERE id = 3 AND immich_album_id IS NULL;
