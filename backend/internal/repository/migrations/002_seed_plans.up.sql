INSERT INTO plans (name, max_photos, max_events, photos_per_guest, max_storage_mb, price, features_json) VALUES
('Starter', 500, 1, 20, 1000, 0, '{"qr_code": true, "event_link": true, "basic_gallery": true}'),
('Professional', 1000, 5, 30, 5000, 29, '{"qr_code": true, "event_link": true, "advanced_gallery": true, "download_all": true}'),
('Business', 5000, 25, 50, 25000, 99, '{"qr_code": true, "event_link": true, "advanced_gallery": true, "download_all": true, "custom_branding": true, "analytics": true}');

-- Create default admin user (password: admin123)
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@pico.app', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Platform Admin', 'admin');
