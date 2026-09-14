-- Seed plans and admin user

INSERT INTO plans (id, name, max_photos, max_events, photos_per_guest, max_storage_mb, price, features_json) VALUES
('00000000-0000-0000-0000-000000000001', 'Starter', 500, 1, 20, 1000, 0, '{"qr_code": true, "event_link": true, "basic_gallery": true}'),
('00000000-0000-0000-0000-000000000002', 'Professional', 1000, 5, 30, 5000, 29, '{"qr_code": true, "event_link": true, "advanced_gallery": true, "download_all": true}'),
('00000000-0000-0000-0000-000000000003', 'Business', 5000, 25, 50, 25000, 99, '{"qr_code": true, "event_link": true, "advanced_gallery": true, "download_all": true, "custom_branding": true, "analytics": true}');

-- Create default admin user (password: admin123)
-- Note: bcrypt hash will need to be generated at runtime or replaced
-- For now we'll use a known working hash
INSERT INTO users (id, email, password_hash, name, role) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@pico.app', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Platform Admin', 'admin');
