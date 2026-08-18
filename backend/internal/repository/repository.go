package repository

import (
	"context"
	"fmt"
	"pico/internal/model"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type DB struct {
	pool *pgxpool.Pool
}

func NewDB(databaseURL string) (*DB, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parsing database URL: %w", err)
	}

	config.MaxConns = 10
	config.MinConns = 2

	pool, err := pgxpool.ConnectConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("connecting to database: %w", err)
	}

	return &DB{pool: pool}, nil
}

func (db *DB) Close() {
	db.pool.Close()
}

func (db *DB) Pool() *pgxpool.Pool {
	return db.pool
}

type Repositories struct {
	Users         UserRepo
	Businesses    BusinessRepo
	Plans         PlanRepo
	Subscriptions SubscriptionRepo
	Events        EventRepo
	Guests        GuestRepo
	Photos        PhotoRepo
}

func NewRepositories(db *DB) *Repositories {
	return &Repositories{
		Users:         UserRepo{db: db},
		Businesses:    BusinessRepo{db: db},
		Plans:         PlanRepo{db: db},
		Subscriptions: SubscriptionRepo{db: db},
		Events:        EventRepo{db: db},
		Guests:        GuestRepo{db: db},
		Photos:        PhotoRepo{db: db},
	}
}

// Transaction helper
func (db *DB) WithTx(ctx context.Context, fn func(pgx.Tx) error) error {
	tx, err := db.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}

	if err := fn(tx); err != nil {
		_ = tx.Rollback(ctx)
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}

	return nil
}

// UserRepo operations
type UserRepo struct{ db *DB }

func (r *UserRepo) Create(ctx context.Context, email, passwordHash, name, role string) (*model.User, error) {
	query := `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at, updated_at`
	var user model.User
	err := r.db.pool.QueryRow(ctx, query, email, passwordHash, name, role).Scan(
		&user.ID, &user.Email, &user.Name, &user.Role, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}
	return &user, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE email = $1`
	var user model.User
	err := r.db.pool.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("fetching user: %w", err)
	}
	return &user, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id int64) (*model.User, error) {
	query := `SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE id = $1`
	var user model.User
	err := r.db.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.Role, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("fetching user: %w", err)
	}
	return &user, nil
}

// BusinessRepo operations
type BusinessRepo struct{ db *DB }

func (r *BusinessRepo) Create(ctx context.Context, userID int64, name, slug string) (*model.Business, error) {
	query := `INSERT INTO businesses (user_id, name, slug) VALUES ($1, $2, $3) RETURNING id, user_id, name, slug, created_at`
	var biz model.Business
	err := r.db.pool.QueryRow(ctx, query, userID, name, slug).Scan(
		&biz.ID, &biz.UserID, &biz.Name, &biz.Slug, &biz.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating business: %w", err)
	}
	return &biz, nil
}

func (r *BusinessRepo) GetByID(ctx context.Context, id int64) (*model.Business, error) {
	query := `SELECT id, user_id, name, slug, logo_url, created_at FROM businesses WHERE id = $1`
	var biz model.Business
	err := r.db.pool.QueryRow(ctx, query, id).Scan(
		&biz.ID, &biz.UserID, &biz.Name, &biz.Slug, &biz.LogoURL, &biz.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("fetching business: %w", err)
	}
	return &biz, nil
}

func (r *BusinessRepo) GetBySlug(ctx context.Context, slug string) (*model.Business, error) {
	query := `SELECT id, user_id, name, slug, logo_url, created_at FROM businesses WHERE slug = $1`
	var biz model.Business
	err := r.db.pool.QueryRow(ctx, query, slug).Scan(
		&biz.ID, &biz.UserID, &biz.Name, &biz.Slug, &biz.LogoURL, &biz.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("fetching business: %w", err)
	}
	return &biz, nil
}

func (r *BusinessRepo) GetAll(ctx context.Context, limit, offset int) ([]model.Business, error) {
	query := `SELECT id, user_id, name, slug, logo_url, created_at FROM businesses ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	rows, err := r.db.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("fetching businesses: %w", err)
	}
	defer rows.Close()

	var businesses []model.Business
	for rows.Next() {
		var biz model.Business
		if err := rows.Scan(&biz.ID, &biz.UserID, &biz.Name, &biz.Slug, &biz.LogoURL, &biz.CreatedAt); err != nil {
			return nil, err
		}
		businesses = append(businesses, biz)
	}
	return businesses, nil
}

func (r *BusinessRepo) Count(ctx context.Context) (int, error) {
	var count int
	err := r.db.pool.QueryRow(ctx, `SELECT COUNT(*) FROM businesses`).Scan(&count)
	return count, err
}

func (r *BusinessRepo) SetSuspended(ctx context.Context, id int64, suspended bool) error {
	status := "active"
	if suspended {
		status = "suspended"
	}
	_, err := r.db.pool.Exec(ctx, `UPDATE subscriptions SET status = $1 WHERE business_id = $2`, status, id)
	return err
}

// PlanRepo operations
type PlanRepo struct{ db *DB }

func (r *PlanRepo) Create(ctx context.Context, plan *model.Plan) (*model.Plan, error) {
	query := `INSERT INTO plans (name, max_photos, max_events, photos_per_guest, max_storage_mb, price, features_json) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`
	err := r.db.pool.QueryRow(ctx, query, plan.Name, plan.MaxPhotos, plan.MaxEvents, plan.PhotosPerGuest, plan.MaxStorageMB, plan.Price, plan.FeaturesJSON).Scan(
		&plan.ID, &plan.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating plan: %w", err)
	}
	return plan, nil
}

func (r *PlanRepo) GetByID(ctx context.Context, id int64) (*model.Plan, error) {
	query := `SELECT id, name, max_photos, max_events, photos_per_guest, max_storage_mb, price, features_json, created_at FROM plans WHERE id = $1`
	var plan model.Plan
	err := r.db.pool.QueryRow(ctx, query, id).Scan(
		&plan.ID, &plan.Name, &plan.MaxPhotos, &plan.MaxEvents, &plan.PhotosPerGuest, &plan.MaxStorageMB, &plan.Price, &plan.FeaturesJSON, &plan.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("fetching plan: %w", err)
	}
	return &plan, nil
}

func (r *PlanRepo) GetAll(ctx context.Context) ([]model.Plan, error) {
	query := `SELECT id, name, max_photos, max_events, photos_per_guest, max_storage_mb, price, features_json, created_at FROM plans ORDER BY price ASC`
	rows, err := r.db.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("fetching plans: %w", err)
	}
	defer rows.Close()

	var plans []model.Plan
	for rows.Next() {
		var plan model.Plan
		if err := rows.Scan(&plan.ID, &plan.Name, &plan.MaxPhotos, &plan.MaxEvents, &plan.PhotosPerGuest, &plan.MaxStorageMB, &plan.Price, &plan.FeaturesJSON, &plan.CreatedAt); err != nil {
			return nil, err
		}
		plans = append(plans, plan)
	}
	return plans, nil
}

func (r *PlanRepo) Update(ctx context.Context, plan *model.Plan) error {
	query := `UPDATE plans SET name = $1, max_photos = $2, max_events = $3, photos_per_guest = $4, max_storage_mb = $5, price = $6, features_json = $7 WHERE id = $8`
	_, err := r.db.pool.Exec(ctx, query, plan.Name, plan.MaxPhotos, plan.MaxEvents, plan.PhotosPerGuest, plan.MaxStorageMB, plan.Price, plan.FeaturesJSON, plan.ID)
	return err
}

func (r *PlanRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.pool.Exec(ctx, `DELETE FROM plans WHERE id = $1`, id)
	return err
}

func (r *PlanRepo) Count(ctx context.Context) (int, error) {
	var count int
	err := r.db.pool.QueryRow(ctx, `SELECT COUNT(*) FROM plans`).Scan(&count)
	return count, err
}

// SubscriptionRepo operations
type SubscriptionRepo struct{ db *DB }

func (r *SubscriptionRepo) Create(ctx context.Context, businessID, planID int64) (*model.Subscription, error) {
	query := `INSERT INTO subscriptions (business_id, plan_id, status) VALUES ($1, $2, 'active') RETURNING id, business_id, plan_id, status, current_period_start, current_period_end, created_at`
	var sub model.Subscription
	err := r.db.pool.QueryRow(ctx, query, businessID, planID).Scan(
		&sub.ID, &sub.BusinessID, &sub.PlanID, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating subscription: %w", err)
	}
	return &sub, nil
}

func (r *SubscriptionRepo) GetByBusinessID(ctx context.Context, businessID int64) (*model.Subscription, error) {
	query := `SELECT id, business_id, plan_id, status, current_period_start, current_period_end, created_at FROM subscriptions WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1`
	var sub model.Subscription
	err := r.db.pool.QueryRow(ctx, query, businessID).Scan(
		&sub.ID, &sub.BusinessID, &sub.PlanID, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("fetching subscription: %w", err)
	}
	return &sub, nil
}

// EventRepo operations
type EventRepo struct{ db *DB }

func (r *EventRepo) Create(ctx context.Context, event *model.Event) (*model.Event, error) {
	query := `INSERT INTO events (business_id, name, slug, description, cover_image_url, start_date, end_date, status, total_photo_limit, guest_photo_limit, allow_downloads) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, created_at, updated_at`
	err := r.db.pool.QueryRow(ctx, query, event.BusinessID, event.Name, event.Slug, event.Description, event.CoverImageURL, event.StartDate, event.EndDate, event.Status, event.TotalPhotoLimit, event.GuestPhotoLimit, event.AllowDownloads).Scan(
		&event.ID, &event.CreatedAt, &event.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating event: %w", err)
	}
	return event, nil
}

func (r *EventRepo) GetByID(ctx context.Context, id int64) (*model.Event, error) {
	query := `SELECT id, business_id, name, slug, description, cover_image_url, start_date, end_date, status, total_photo_limit, guest_photo_limit, allow_downloads, created_at, updated_at FROM events WHERE id = $1`
	var event model.Event
	err := r.db.pool.QueryRow(ctx, query, id).Scan(
		&event.ID, &event.BusinessID, &event.Name, &event.Slug, &event.Description, &event.CoverImageURL, &event.StartDate, &event.EndDate, &event.Status, &event.TotalPhotoLimit, &event.GuestPhotoLimit, &event.AllowDownloads, &event.CreatedAt, &event.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("fetching event: %w", err)
	}
	return &event, nil
}

func (r *EventRepo) GetBySlug(ctx context.Context, slug string) (*model.Event, error) {
	query := `SELECT id, business_id, name, slug, description, cover_image_url, start_date, end_date, status, total_photo_limit, guest_photo_limit, allow_downloads, created_at, updated_at FROM events WHERE slug = $1`
	var event model.Event
	err := r.db.pool.QueryRow(ctx, query, slug).Scan(
		&event.ID, &event.BusinessID, &event.Name, &event.Slug, &event.Description, &event.CoverImageURL, &event.StartDate, &event.EndDate, &event.Status, &event.TotalPhotoLimit, &event.GuestPhotoLimit, &event.AllowDownloads, &event.CreatedAt, &event.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("fetching event: %w", err)
	}
	return &event, nil
}

func (r *EventRepo) GetByBusinessID(ctx context.Context, businessID int64, limit, offset int) ([]model.Event, error) {
	query := `SELECT id, business_id, name, slug, description, cover_image_url, start_date, end_date, status, total_photo_limit, guest_photo_limit, allow_downloads, created_at, updated_at FROM events WHERE business_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	rows, err := r.db.pool.Query(ctx, query, businessID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("fetching events: %w", err)
	}
	defer rows.Close()

	var events []model.Event
	for rows.Next() {
		var event model.Event
		if err := rows.Scan(&event.ID, &event.BusinessID, &event.Name, &event.Slug, &event.Description, &event.CoverImageURL, &event.StartDate, &event.EndDate, &event.Status, &event.TotalPhotoLimit, &event.GuestPhotoLimit, &event.AllowDownloads, &event.CreatedAt, &event.UpdatedAt); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, nil
}

func (r *EventRepo) GetAll(ctx context.Context, limit, offset int) ([]model.Event, error) {
	query := `SELECT id, business_id, name, slug, description, cover_image_url, start_date, end_date, status, total_photo_limit, guest_photo_limit, allow_downloads, created_at, updated_at FROM events ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	rows, err := r.db.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("fetching events: %w", err)
	}
	defer rows.Close()

	var events []model.Event
	for rows.Next() {
		var event model.Event
		if err := rows.Scan(&event.ID, &event.BusinessID, &event.Name, &event.Slug, &event.Description, &event.CoverImageURL, &event.StartDate, &event.EndDate, &event.Status, &event.TotalPhotoLimit, &event.GuestPhotoLimit, &event.AllowDownloads, &event.CreatedAt, &event.UpdatedAt); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, nil
}

func (r *EventRepo) Count(ctx context.Context) (int, error) {
	var count int
	err := r.db.pool.QueryRow(ctx, `SELECT COUNT(*) FROM events`).Scan(&count)
	return count, err
}

func (r *EventRepo) CountActive(ctx context.Context, businessID int64) (int, error) {
	var count int
	err := r.db.pool.QueryRow(ctx, `SELECT COUNT(*) FROM events WHERE business_id = $1 AND status = 'active'`, businessID).Scan(&count)
	return count, err
}

func (r *EventRepo) Update(ctx context.Context, event *model.Event) error {
	query := `UPDATE events SET name = $1, slug = $2, description = $3, cover_image_url = $4, start_date = $5, end_date = $6, status = $7, total_photo_limit = $8, guest_photo_limit = $9, allow_downloads = $10, updated_at = NOW() WHERE id = $11`
	_, err := r.db.pool.Exec(ctx, query, event.Name, event.Slug, event.Description, event.CoverImageURL, event.StartDate, event.EndDate, event.Status, event.TotalPhotoLimit, event.GuestPhotoLimit, event.AllowDownloads, event.ID)
	return err
}

func (r *EventRepo) Close(ctx context.Context, id int64) error {
	_, err := r.db.pool.Exec(ctx, `UPDATE events SET status = 'closed', updated_at = NOW() WHERE id = $1`, id)
	return err
}

// GuestRepo operations
type GuestRepo struct{ db *DB }

func (r *GuestRepo) Create(ctx context.Context, guest *model.Guest) (*model.Guest, error) {
	query := `INSERT INTO guests (event_id, guest_token_hash, name, photo_count) VALUES ($1, $2, $3, $4) RETURNING id, created_at, last_active_at`
	err := r.db.pool.QueryRow(ctx, query, guest.EventID, guest.GuestToken, guest.Name, guest.PhotoCount).Scan(
		&guest.ID, &guest.CreatedAt, &guest.LastActiveAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating guest: %w", err)
	}
	return guest, nil
}

func (r *GuestRepo) GetByTokenHash(ctx context.Context, eventID int64, tokenHash string) (*model.Guest, error) {
	query := `SELECT id, event_id, guest_token_hash, name, photo_count, created_at, last_active_at FROM guests WHERE event_id = $1 AND guest_token_hash = $2`
	var guest model.Guest
	err := r.db.pool.QueryRow(ctx, query, eventID, tokenHash).Scan(
		&guest.ID, &guest.EventID, &guest.GuestToken, &guest.Name, &guest.PhotoCount, &guest.CreatedAt, &guest.LastActiveAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("guest not found")
		}
		return nil, fmt.Errorf("fetching guest: %w", err)
	}
	return &guest, nil
}

func (r *GuestRepo) IncrementPhotoCount(ctx context.Context, guestID int64) error {
	_, err := r.db.pool.Exec(ctx, `UPDATE guests SET photo_count = photo_count + 1, last_active_at = NOW() WHERE id = $1`, guestID)
	return err
}

func (r *GuestRepo) CountByEvent(ctx context.Context, eventID int64) (int, error) {
	var count int
	err := r.db.pool.QueryRow(ctx, `SELECT COUNT(*) FROM guests WHERE event_id = $1`, eventID).Scan(&count)
	return count, err
}

func (r *GuestRepo) GetPhotoCount(ctx context.Context, guestID int64) (int, error) {
	var count int
	err := r.db.pool.QueryRow(ctx, `SELECT photo_count FROM guests WHERE id = $1`, guestID).Scan(&count)
	return count, err
}

// PhotoRepo operations
type PhotoRepo struct{ db *DB }

func (r *PhotoRepo) Create(ctx context.Context, photo *model.Photo) (*model.Photo, error) {
	query := `INSERT INTO photos (event_id, guest_id, storage_path, thumbnail_path, original_filename, file_size_bytes, mime_type, width, height, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, url, thumbnail_url, created_at`
	err := r.db.pool.QueryRow(ctx, query, photo.EventID, photo.GuestID, photo.StoragePath, photo.ThumbnailPath, photo.OriginalFilename, photo.FileSizeBytes, photo.MimeType, photo.Width, photo.Height, photo.Status).Scan(
		&photo.ID, &photo.URL, &photo.ThumbnailURL, &photo.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating photo: %w", err)
	}
	return photo, nil
}

func (r *PhotoRepo) GetByID(ctx context.Context, id int64) (*model.Photo, error) {
	query := `SELECT id, event_id, guest_id, storage_path, thumbnail_path, url, thumbnail_url, original_filename, file_size_bytes, mime_type, width, height, status, created_at FROM photos WHERE id = $1`
	var photo model.Photo
	err := r.db.pool.QueryRow(ctx, query, id).Scan(
		&photo.ID, &photo.EventID, &photo.GuestID, &photo.StoragePath, &photo.ThumbnailPath, &photo.URL, &photo.ThumbnailURL, &photo.OriginalFilename, &photo.FileSizeBytes, &photo.MimeType, &photo.Width, &photo.Height, &photo.Status, &photo.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("fetching photo: %w", err)
	}
	return &photo, nil
}

func (r *PhotoRepo) GetByEvent(ctx context.Context, eventID int64, limit, offset int) ([]model.Photo, error) {
	query := `SELECT id, event_id, guest_id, storage_path, thumbnail_path, url, thumbnail_url, original_filename, file_size_bytes, mime_type, width, height, status, created_at FROM photos WHERE event_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	rows, err := r.db.pool.Query(ctx, query, eventID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("fetching photos: %w", err)
	}
	defer rows.Close()

	var photos []model.Photo
	for rows.Next() {
		var photo model.Photo
		if err := rows.Scan(&photo.ID, &photo.EventID, &photo.GuestID, &photo.StoragePath, &photo.ThumbnailPath, &photo.URL, &photo.ThumbnailURL, &photo.OriginalFilename, &photo.FileSizeBytes, &photo.MimeType, &photo.Width, &photo.Height, &photo.Status, &photo.CreatedAt); err != nil {
			return nil, err
		}
		photos = append(photos, photo)
	}
	return photos, nil
}

func (r *PhotoRepo) CountByEvent(ctx context.Context, eventID int64) (int, error) {
	var count int
	err := r.db.pool.QueryRow(ctx, `SELECT COUNT(*) FROM photos WHERE event_id = $1 AND status = 'active'`, eventID).Scan(&count)
	return count, err
}

func (r *PhotoRepo) CountAll(ctx context.Context) (int, error) {
	var count int
	err := r.db.pool.QueryRow(ctx, `SELECT COUNT(*) FROM photos WHERE status = 'active'`).Scan(&count)
	return count, err
}

func (r *PhotoRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.pool.Exec(ctx, `UPDATE photos SET status = 'deleted' WHERE id = $1`, id)
	return err
}

func (r *PhotoRepo) GetEventPhotoCounts(ctx context.Context, businessID int64) ([]model.EventPhotoCount, error) {
	query := `
		SELECT e.id, e.name, COALESCE(p.cnt, 0), COALESCE(g.cnt, 0)
		FROM events e
		LEFT JOIN (SELECT event_id, COUNT(*) as cnt FROM photos WHERE status = 'active' GROUP BY event_id) p ON e.id = p.event_id
		LEFT JOIN (SELECT event_id, COUNT(*) as cnt FROM guests GROUP BY event_id) g ON e.id = g.event_id
		WHERE e.business_id = $1
		ORDER BY e.created_at DESC
	`
	rows, err := r.db.pool.Query(ctx, query, businessID)
	if err != nil {
		return nil, fmt.Errorf("fetching event photo counts: %w", err)
	}
	defer rows.Close()

	var results []model.EventPhotoCount
	for rows.Next() {
		var epc model.EventPhotoCount
		if err := rows.Scan(&epc.EventID, &epc.EventName, &epc.PhotoCount, &epc.GuestCount); err != nil {
			return nil, err
		}
		results = append(results, epc)
	}
	return results, nil
}

func (r *PhotoRepo) SumStorageUsed(ctx context.Context, businessID int64) (float64, error) {
	var totalBytes *int64
	err := r.db.pool.QueryRow(ctx, `
		SELECT SUM(p.file_size_bytes) 
		FROM photos p
		JOIN events e ON p.event_id = e.id
		WHERE e.business_id = $1 AND p.status = 'active'
	`, businessID).Scan(&totalBytes)
	if err != nil {
		return 0, err
	}
	if totalBytes == nil {
		return 0, nil
	}
	return float64(*totalBytes) / (1024 * 1024), nil
}

func (r *PhotoRepo) SumTotalStorage(ctx context.Context) (float64, error) {
	var totalBytes *int64
	err := r.db.pool.QueryRow(ctx, `SELECT SUM(file_size_bytes) FROM photos WHERE status = 'active'`).Scan(&totalBytes)
	if err != nil {
		return 0, err
	}
	if totalBytes == nil {
		return 0, nil
	}
	return float64(*totalBytes) / (1024 * 1024), nil
}
