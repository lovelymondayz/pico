package model

import "time"

// User represents platform administrators and business owners
type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         string    `json:"role"` // "admin", "business"
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Business represents a business account
type Business struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	LogoURL   string    `json:"logo_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// Plan represents a subscription plan
type Plan struct {
	ID              int64     `json:"id"`
	Name            string    `json:"name"`
	MaxPhotos       int       `json:"max_photos"`
	MaxEvents       int       `json:"max_events"`
	PhotosPerGuest  int       `json:"photos_per_guest"`
	MaxStorageMB    int       `json:"max_storage_mb"`
	Price           float64   `json:"price"`
	FeaturesJSON    string    `json:"features_json,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

// Subscription tracks which plan a business is using
type Subscription struct {
	ID                 int64     `json:"id"`
	BusinessID         int64     `json:"business_id"`
	PlanID             int64     `json:"plan_id"`
	Status             string    `json:"status"` // "active", "cancelled", "expired"
	CurrentPeriodStart time.Time `json:"current_period_start"`
	CurrentPeriodEnd   time.Time `json:"current_period_end"`
	CreatedAt          time.Time `json:"created_at"`
}

// Event represents a photo-sharing event
type Event struct {
	ID              int64     `json:"id"`
	BusinessID      int64     `json:"business_id"`
	Name            string    `json:"name"`
	Slug            string    `json:"slug"`
	Description     string    `json:"description,omitempty"`
	CoverImageURL   string    `json:"cover_image_url,omitempty"`
	StartDate       time.Time `json:"start_date"`
	EndDate         time.Time `json:"end_date"`
	Status          string    `json:"status"` // "active", "closed", "archived"
	TotalPhotoLimit int       `json:"total_photo_limit"`
	GuestPhotoLimit int       `json:"guest_photo_limit"`
	AllowDownloads  bool      `json:"allow_downloads"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Guest represents an anonymous event participant
type Guest struct {
	ID           int64     `json:"id"`
	EventID      int64     `json:"event_id"`
	GuestToken   string    `json:"guest_token,omitempty"`
	Name         string    `json:"name,omitempty"`
	PhotoCount   int       `json:"photo_count"`
	CreatedAt    time.Time `json:"created_at"`
	LastActiveAt time.Time `json:"last_active_at"`
}

// Photo represents an uploaded photo
type Photo struct {
	ID               int64     `json:"id"`
	EventID          int64     `json:"event_id"`
	GuestID          int64     `json:"guest_id"`
	StoragePath      string    `json:"-"`
	ThumbnailPath    string    `json:"-"`
	URL              string    `json:"url"`
	ThumbnailURL     string    `json:"thumbnail_url"`
	OriginalFilename string    `json:"original_filename"`
	FileSizeBytes    int64     `json:"file_size_bytes"`
	MimeType         string    `json:"mime_type"`
	Width            int       `json:"width"`
	Height           int       `json:"height"`
	Status           string    `json:"status"` // "active", "deleted", "flagged"
	CreatedAt        time.Time `json:"created_at"`
}

// PhotoEvent is sent via SSE when a new photo is uploaded
type PhotoEvent struct {
	Type  string `json:"type"`
	Photo Photo  `json:"photo"`
}

// DashboardStats for business dashboard
type DashboardStats struct {
	TotalEvents      int     `json:"total_events"`
	ActiveEvents     int     `json:"active_events"`
	TotalPhotos      int     `json:"total_photos"`
	RemainingPhotos  int     `json:"remaining_photos"`
	StorageUsedMB    float64 `json:"storage_used_mb"`
	TotalGuests      int     `json:"total_guests"`
	PhotosPerEvent   []EventPhotoCount `json:"photos_per_event"`
}

type EventPhotoCount struct {
	EventID    int64  `json:"event_id"`
	EventName  string `json:"event_name"`
	PhotoCount int    `json:"photo_count"`
	GuestCount int    `json:"guest_count"`
}

// AdminStats for admin dashboard
type AdminStats struct {
	TotalBusinesses int     `json:"total_businesses"`
	TotalEvents     int     `json:"total_events"`
	TotalPhotos     int     `json:"total_photos"`
	TotalStorageMB  float64 `json:"total_storage_mb"`
	ActivePlans     int     `json:"active_plans"`
}
