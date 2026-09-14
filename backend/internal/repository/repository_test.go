package repository

import (
	"context"
	"fmt"
	"testing"

	"pico/internal/model"
)

// Integration tests require a running PostgreSQL instance
// Run with: go test -tags=integration ./...

func getTestDB(t *testing.T) *DB {
	t.Helper()
	databaseURL := "postgres://pico:testpass@localhost:5432/pico_test?sslmode=disable"
	
	db, err := NewDB(databaseURL)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	
	// Run migrations
	err = RunMigrations(db)
	if err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}
	
	return db
}

func cleanupDB(t *testing.T, db *DB) {
	t.Helper()
	ctx := context.Background()
	
	// Clean all tables
	_, _ = db.Pool().Exec(ctx, "DELETE FROM photos")
	_, _ = db.Pool().Exec(ctx, "DELETE FROM guests")
	_, _ = db.Pool().Exec(ctx, "DELETE FROM events")
	_, _ = db.Pool().Exec(ctx, "DELETE FROM subscriptions")
	_, _ = db.Pool().Exec(ctx, "DELETE FROM businesses")
	_, _ = db.Pool().Exec(ctx, "DELETE FROM users")
	_, _ = db.Pool().Exec(ctx, "DELETE FROM plans")
}

func TestUserRepo_Create(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}
	
	db := getTestDB(t)
	defer db.Close()
	cleanupDB(t, db)
	
	repo := UserRepo{db: db}
	ctx := context.Background()
	
	user, err := repo.Create(ctx, "test@example.com", "hashtest", "Test User", "business")
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if user.ID == "" {
		t.Error("Expected non-empty user ID")
	}
	if user.Email != "test@example.com" {
		t.Errorf("Expected email test@example.com, got %s", user.Email)
	}
}

func TestUserRepo_GetByEmail(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}
	
	db := getTestDB(t)
	defer db.Close()
	cleanupDB(t, db)
	
	repo := UserRepo{db: db}
	ctx := context.Background()
	
	_, err := repo.Create(ctx, "find@example.com", "hashtest", "Find Me", "business")
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	
	user, err := repo.GetByEmail(ctx, "find@example.com")
	if err != nil {
		t.Fatalf("GetByEmail failed: %v", err)
	}
	if user.Email != "find@example.com" {
		t.Errorf("Expected email find@example.com, got %s", user.Email)
	}
	
	_, err = repo.GetByEmail(ctx, "nonexistent@example.com")
	if err == nil {
		t.Error("Expected error for non-existent email")
	}
}

func TestUserRepo_GetAll_EmptySlice(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}
	
	db := getTestDB(t)
	defer db.Close()
	cleanupDB(t, db)
	
	repo := UserRepo{db: db}
	ctx := context.Background()
	
	users, err := repo.GetAll(ctx, 10, 0)
	if err != nil {
		t.Fatalf("GetAll failed: %v", err)
	}
	if users == nil {
		t.Error("Expected non-nil slice")
	}
	if len(users) != 0 {
		t.Errorf("Expected 0 users, got %d", len(users))
	}
}

func TestPlanRepo_Create(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}
	
	db := getTestDB(t)
	defer db.Close()
	cleanupDB(t, db)
	
	repo := PlanRepo{db: db}
	ctx := context.Background()
	
	plan := &model.Plan{
		Name:           "Test Plan",
		MaxPhotos:      100,
		MaxEvents:      5,
		PhotosPerGuest: 10,
		MaxStorageMB:   1000,
		Price:          9.99,
		FeaturesJSON:   `{"test": true}`,
	}
	
	created, err := repo.Create(ctx, plan)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if created.ID == "" {
		t.Error("Expected non-empty plan ID")
	}
	if created.Name != "Test Plan" {
		t.Errorf("Expected name Test Plan, got %s", created.Name)
	}
}

func TestEventRepo_Create(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}
	
	db := getTestDB(t)
	defer db.Close()
	cleanupDB(t, db)
	
	userRepo := UserRepo{db: db}
	bizRepo := BusinessRepo{db: db}
	eventRepo := EventRepo{db: db}
	ctx := context.Background()
	
	user, err := userRepo.Create(ctx, "owner@example.com", "hash", "Owner", "business")
	if err != nil {
		t.Fatalf("User create failed: %v", err)
	}
	
	biz, err := bizRepo.Create(ctx, user.ID, "Test Biz", "test-biz")
	if err != nil {
		t.Fatalf("Business create failed: %v", err)
	}
	
	event := &model.Event{
		BusinessID:      biz.ID,
		Name:            "Test Event",
		Slug:            "test-event",
		Description:     "A test event",
		Status:          "active",
		TotalPhotoLimit: 100,
		GuestPhotoLimit: 10,
		AllowDownloads:  true,
	}
	
	created, err := eventRepo.Create(ctx, event)
	if err != nil {
		t.Fatalf("Event create failed: %v", err)
	}
	if created.ID == "" {
		t.Error("Expected non-empty event ID")
	}
	if created.Name != "Test Event" {
		t.Errorf("Expected name Test Event, got %s", created.Name)
	}
}

func TestPhotoRepo_CreateAndUpdate(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}
	
	db := getTestDB(t)
	defer db.Close()
	cleanupDB(t, db)
	
	userRepo := UserRepo{db: db}
	bizRepo := BusinessRepo{db: db}
	eventRepo := EventRepo{db: db}
	guestRepo := GuestRepo{db: db}
	photoRepo := PhotoRepo{db: db}
	ctx := context.Background()
	
	user, err := userRepo.Create(ctx, "photo@example.com", "hash", "Photo Owner", "business")
	if err != nil {
		t.Fatalf("User create failed: %v", err)
	}
	
	biz, err := bizRepo.Create(ctx, user.ID, "Photo Biz", "photo-biz")
	if err != nil {
		t.Fatalf("Business create failed: %v", err)
	}
	
	event, err := eventRepo.Create(ctx, &model.Event{
		BusinessID:      biz.ID,
		Name:            "Photo Event",
		Slug:            "photo-event",
		Status:          "active",
		TotalPhotoLimit: 100,
		GuestPhotoLimit: 10,
	})
	if err != nil {
		t.Fatalf("Event create failed: %v", err)
	}
	
	guest, err := guestRepo.Create(ctx, &model.Guest{
		EventID:    event.ID,
		GuestToken: "testhash",
		Name:       "Test Guest",
	})
	if err != nil {
		t.Fatalf("Guest create failed: %v", err)
	}
	
	photo := &model.Photo{
		EventID:          event.ID,
		GuestID:          guest.ID,
		StoragePath:      "test/path.jpg",
		ThumbnailPath:    "test/thumb.jpg",
		URL:              "/photos/test",
		ThumbnailURL:     "/photos/test/thumb",
		OriginalFilename: "test.jpg",
		FileSizeBytes:    1024,
		MimeType:         "image/jpeg",
		Width:            100,
		Height:           100,
		Status:           "active",
	}
	
	created, err := photoRepo.Create(ctx, photo)
	if err != nil {
		t.Fatalf("Photo create failed: %v", err)
	}
	if created.ID == "" {
		t.Error("Expected non-empty photo ID")
	}
	
	// Test update
	created.StoragePath = "updated/path.jpg"
	err = photoRepo.Update(ctx, created)
	if err != nil {
		t.Fatalf("Photo update failed: %v", err)
	}
	
	updated, err := photoRepo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("Photo get failed: %v", err)
	}
	if updated.StoragePath != "updated/path.jpg" {
		t.Errorf("Expected updated path, got %s", updated.StoragePath)
	}
}

func TestGuestRepo_CountGuestsByBusiness(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}
	
	db := getTestDB(t)
	defer db.Close()
	cleanupDB(t, db)
	
	repo := GuestRepo{db: db}
	ctx := context.Background()
	
	userRepo := UserRepo{db: db}
	bizRepo := BusinessRepo{db: db}
	eventRepo := EventRepo{db: db}
	
	user, _ := userRepo.Create(ctx, "count@example.com", "hash", "Counter", "business")
	biz, _ := bizRepo.Create(ctx, user.ID, "Count Biz", "count-biz")
	event, _ := eventRepo.Create(ctx, &model.Event{
		BusinessID:      biz.ID,
		Name:            "Count Event",
		Slug:            "count-event",
		Status:          "active",
		TotalPhotoLimit: 100,
		GuestPhotoLimit: 10,
	})
	
	// Create multiple guests
	for i := 0; i < 5; i++ {
		_, err := repo.Create(ctx, &model.Guest{
			EventID:    event.ID,
			GuestToken: fmt.Sprintf("hash%d", i),
			Name:       fmt.Sprintf("Guest %d", i),
		})
		if err != nil {
			t.Fatalf("Guest create failed: %v", err)
		}
	}
	
	count, err := repo.CountGuestsByBusiness(ctx, biz.ID)
	if err != nil {
		t.Fatalf("CountGuestsByBusiness failed: %v", err)
	}
	if count != 5 {
		t.Errorf("Expected 5 guests, got %d", count)
	}
}
