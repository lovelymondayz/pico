package service

import (
	"context"
	"fmt"
	"pico/internal/auth"
	"pico/internal/config"
	"pico/internal/model"
	"pico/internal/repository"
	"pico/internal/storage"
	"pico/internal/util"
	"time"

	"github.com/google/uuid"
)

type Services struct {
	Auth      *auth.Service
	Business  *BusinessService
	Event     *EventService
	Photo     *PhotoService
	Guest     *GuestService
	Admin     *AdminService
	storage   storage.Storage
	repo      *repository.Repositories
	config    *config.Config
	photoProc *util.ImageProcessor
	qrGen     *util.QRGenerator
}

func NewServices(repo *repository.Repositories, store storage.Storage, imageProc *util.ImageProcessor, qrGen *util.QRGenerator, cfg *config.Config) *Services {
	s := &Services{
		Auth:      auth.NewService(cfg),
		storage:   store,
		repo:      repo,
		config:    cfg,
		photoProc: imageProc,
		qrGen:     qrGen,
	}
	s.Business = &BusinessService{s: s}
	s.Event = &EventService{s: s}
	s.Photo = &PhotoService{s: s}
	s.Guest = &GuestService{s: s}
	s.Admin = &AdminService{s: s}
	return s
}

func (s *Services) GetStorage() storage.Storage {
	return s.storage
}

// Auth helper methods
func (s *Services) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	return s.repo.Users.GetByEmail(ctx, email)
}

// BusinessService
type BusinessService struct {
	s *Services
}

func (bs *BusinessService) Register(ctx context.Context, email, password, name, businessName string) (*model.User, *model.Business, error) {
	if _, err := bs.s.repo.Users.GetByEmail(ctx, email); err == nil {
		return nil, nil, fmt.Errorf("email already registered")
	}

	hash, err := bs.s.Auth.HashPassword(password)
	if err != nil {
		return nil, nil, fmt.Errorf("hashing password: %w", err)
	}

	user, err := bs.s.repo.Users.Create(ctx, email, hash, name, "business")
	if err != nil {
		return nil, nil, fmt.Errorf("creating user: %w", err)
	}

	slug := fmt.Sprintf("%s-%s", generateSlug(businessName), uuid.New().String()[:8])
	biz, err := bs.s.repo.Businesses.Create(ctx, user.ID, businessName, slug)
	if err != nil {
		return nil, nil, fmt.Errorf("creating business: %w", err)
	}

	plans, err := bs.s.repo.Plans.GetAll(ctx)
	if err == nil && len(plans) > 0 {
		_, _ = bs.s.repo.Subscriptions.Create(ctx, biz.ID, plans[0].ID)
	}

	return user, biz, nil
}

func (bs *BusinessService) GetByUserID(ctx context.Context, userID int64) (*model.Business, error) {
	// This requires a new repository method
	// For now, we'll fetch all businesses (inefficient but works for MVP)
	businesses, err := bs.s.repo.Businesses.GetAll(ctx, 1000, 0)
	if err != nil {
		return nil, err
	}
	for _, b := range businesses {
		if b.UserID == userID {
			return &b, nil
		}
	}
	return nil, fmt.Errorf("business not found for user %d", userID)
}

func (bs *BusinessService) GetStats(ctx context.Context, businessID int64) (*model.DashboardStats, error) {
	activeEvents, _ := bs.s.repo.Events.CountActive(ctx, businessID)
	totalPhotos, _ := bs.s.repo.Photos.CountAll(ctx)
	storageMB, _ := bs.s.repo.Photos.SumStorageUsed(ctx, businessID)
	perEvent, _ := bs.s.repo.Photos.GetEventPhotoCounts(ctx, businessID)

	events, err := bs.s.repo.Events.GetByBusinessID(ctx, businessID, 1000, 0)
	if err != nil {
		return nil, err
	}
	totalGuests := 0
	for _, e := range events {
		c, _ := bs.s.repo.Guests.CountByEvent(ctx, e.ID)
		totalGuests += c
	}

	sub, _ := bs.s.repo.Subscriptions.GetByBusinessID(ctx, businessID)
	remainingPhotos := 0
	if sub != nil {
		plan, err := bs.s.repo.Plans.GetByID(ctx, sub.PlanID)
		if err == nil && plan != nil {
			remainingPhotos = plan.MaxPhotos - totalPhotos
			if remainingPhotos < 0 {
				remainingPhotos = 0
			}
		}
	}

	return &model.DashboardStats{
		TotalEvents:     len(events),
		ActiveEvents:    activeEvents,
		TotalPhotos:     totalPhotos,
		RemainingPhotos: remainingPhotos,
		StorageUsedMB:   storageMB,
		TotalGuests:     totalGuests,
		PhotosPerEvent:  perEvent,
	}, nil
}

// EventService
type EventService struct {
	s *Services
}

func (es *EventService) Create(ctx context.Context, businessID int64, name, slug, description string, startDate, endDate time.Time, allowDownloads bool, totalPhotoLimit, guestPhotoLimit int) (*model.Event, error) {
	activeCount, err := es.s.repo.Events.CountActive(ctx, businessID)
	if err != nil {
		return nil, err
	}

	sub, err := es.s.repo.Subscriptions.GetByBusinessID(ctx, businessID)
	if err != nil {
		return nil, fmt.Errorf("no active subscription")
	}

	plan, err := es.s.repo.Plans.GetByID(ctx, sub.PlanID)
	if err != nil {
		return nil, fmt.Errorf("invalid subscription plan")
	}

	if activeCount >= plan.MaxEvents {
		return nil, fmt.Errorf("maximum active events reached for your plan (%d)", plan.MaxEvents)
	}

	if totalPhotoLimit <= 0 {
		totalPhotoLimit = plan.MaxPhotos
	}
	if guestPhotoLimit <= 0 {
		guestPhotoLimit = plan.PhotosPerGuest
	}

	event := &model.Event{
		BusinessID:      businessID,
		Name:            name,
		Slug:            slug,
		Description:     description,
		StartDate:       startDate,
		EndDate:         endDate,
		Status:          "active",
		TotalPhotoLimit: totalPhotoLimit,
		GuestPhotoLimit: guestPhotoLimit,
		AllowDownloads:  allowDownloads,
	}

	return es.s.repo.Events.Create(ctx, event)
}

func (es *EventService) GetBySlug(ctx context.Context, slug string) (*model.Event, error) {
	return es.s.repo.Events.GetBySlug(ctx, slug)
}

func (es *EventService) GetByID(ctx context.Context, id int64) (*model.Event, error) {
	return es.s.repo.Events.GetByID(ctx, id)
}

func (es *EventService) GetByBusinessID(ctx context.Context, businessID int64, limit, offset int) ([]model.Event, error) {
	return es.s.repo.Events.GetByBusinessID(ctx, businessID, limit, offset)
}

func (es *EventService) Update(ctx context.Context, event *model.Event) error {
	return es.s.repo.Events.Update(ctx, event)
}

func (es *EventService) Close(ctx context.Context, id int64) error {
	return es.s.repo.Events.Close(ctx, id)
}

// GuestService
type GuestService struct {
	s *Services
}

func (gs *GuestService) RegisterOrGet(ctx context.Context, eventID int64, name string) (*model.Guest, string, error) {
	token := uuid.New().String()
	tokenHash := auth.HashGuestToken(token)

	existing, err := gs.s.repo.Guests.GetByTokenHash(ctx, eventID, tokenHash)
	if err == nil {
		return existing, token, nil
	}

	guest := &model.Guest{
		EventID:    eventID,
		GuestToken: tokenHash,
		Name:       name,
	}

	created, err := gs.s.repo.Guests.Create(ctx, guest)
	if err != nil {
		return nil, "", err
	}

	return created, token, nil
}

func (gs *GuestService) GetByToken(ctx context.Context, eventID int64, token string) (*model.Guest, error) {
	tokenHash := auth.HashGuestToken(token)
	return gs.s.repo.Guests.GetByTokenHash(ctx, eventID, tokenHash)
}

func (gs *GuestService) IncrementPhotoCount(ctx context.Context, guestID int64) error {
	return gs.s.repo.Guests.IncrementPhotoCount(ctx, guestID)
}

func (gs *GuestService) GetPhotoCount(ctx context.Context, guestID int64) (int, error) {
	return gs.s.repo.Guests.GetPhotoCount(ctx, guestID)
}

// PhotoService
type PhotoService struct {
	s *Services
}

func (ps *PhotoService) Upload(ctx context.Context, eventID, guestID int64, fileBytes []byte, filename, contentType string) (*model.Photo, error) {
	if err := ps.s.photoProc.ValidateFile(int64(len(fileBytes)), contentType); err != nil {
		return nil, err
	}

	processed, width, height, err := ps.s.photoProc.ProcessImage(fileBytes, ps.s.config.ImageMaxWidth, ps.s.config.ImageQuality)
	if err != nil {
		return nil, fmt.Errorf("processing image: %w", err)
	}

	thumbnail, err := ps.s.photoProc.GenerateThumbnail(processed, ps.s.config.ThumbnailWidth)
	if err != nil {
		return nil, fmt.Errorf("generating thumbnail: %w", err)
	}

	id := uuid.New().String()
	photoPath := fmt.Sprintf("%d/%s.jpg", eventID, id)
	thumbPath := fmt.Sprintf("%d/%s_thumb.jpg", eventID, id)

	fullPhotoPath := ps.s.storage.GetFullPath(photoPath)
	fullThumbPath := ps.s.storage.GetFullPath(thumbPath)

	if err := ps.s.storage.SaveBytes(fullPhotoPath, processed); err != nil {
		return nil, fmt.Errorf("saving photo: %w", err)
	}
	if err := ps.s.storage.SaveBytes(fullThumbPath, thumbnail); err != nil {
		return nil, fmt.Errorf("saving thumbnail: %w", err)
	}

	photo := &model.Photo{
		EventID:          eventID,
		GuestID:          guestID,
		StoragePath:      photoPath,
		ThumbnailPath:    thumbPath,
		URL:              fmt.Sprintf("/api/photos/%s", id),
		ThumbnailURL:     fmt.Sprintf("/api/photos/%s/thumb", id),
		OriginalFilename: filename,
		FileSizeBytes:    int64(len(processed)),
		MimeType:         "image/jpeg",
		Width:            width,
		Height:           height,
		Status:           "active",
	}

	return ps.s.repo.Photos.Create(ctx, photo)
}

func (ps *PhotoService) GetByEvent(ctx context.Context, eventID int64, limit, offset int) ([]model.Photo, error) {
	return ps.s.repo.Photos.GetByEvent(ctx, eventID, limit, offset)
}

func (ps *PhotoService) CountByEvent(ctx context.Context, eventID int64) (int, error) {
	return ps.s.repo.Photos.CountByEvent(ctx, eventID)
}

func (ps *PhotoService) GetByID(ctx context.Context, id int64) (*model.Photo, error) {
	return ps.s.repo.Photos.GetByID(ctx, id)
}

func (ps *PhotoService) GenerateQR(ctx context.Context, url string, size int) ([]byte, error) {
	return ps.s.qrGen.GeneratePNG(url, size)
}

// AdminService
type AdminService struct {
	s *Services
}

func (as *AdminService) GetStats(ctx context.Context) (*model.AdminStats, error) {
	totalBiz, _ := as.s.repo.Businesses.Count(ctx)
	totalEvents, _ := as.s.repo.Events.Count(ctx)
	totalPhotos, _ := as.s.repo.Photos.CountAll(ctx)
	totalStorage, _ := as.s.repo.Photos.SumTotalStorage(ctx)
	activePlans, _ := as.s.repo.Plans.Count(ctx)

	return &model.AdminStats{
		TotalBusinesses: totalBiz,
		TotalEvents:     totalEvents,
		TotalPhotos:     totalPhotos,
		TotalStorageMB:  totalStorage,
		ActivePlans:     activePlans,
	}, nil
}

func (as *AdminService) ListPlans(ctx context.Context) ([]model.Plan, error) {
	return as.s.repo.Plans.GetAll(ctx)
}

func (as *AdminService) CreatePlan(ctx context.Context, plan *model.Plan) (*model.Plan, error) {
	return as.s.repo.Plans.Create(ctx, plan)
}

func (as *AdminService) UpdatePlan(ctx context.Context, plan *model.Plan) error {
	return as.s.repo.Plans.Update(ctx, plan)
}

func (as *AdminService) DeletePlan(ctx context.Context, id int64) error {
	return as.s.repo.Plans.Delete(ctx, id)
}

func (as *AdminService) GetPlanByID(ctx context.Context, id int64) (*model.Plan, error) {
	return as.s.repo.Plans.GetByID(ctx, id)
}

func (as *AdminService) ListAllBusinesses(ctx context.Context, limit, offset int) ([]model.Business, error) {
	return as.s.repo.Businesses.GetAll(ctx, limit, offset)
}

func (as *AdminService) ListAllEvents(ctx context.Context, limit, offset int) ([]model.Event, error) {
	return as.s.repo.Events.GetAll(ctx, limit, offset)
}

func (as *AdminService) SuspendBusiness(ctx context.Context, businessID int64, suspended bool) error {
	return as.s.repo.Businesses.SetSuspended(ctx, businessID, suspended)
}

func generateSlug(name string) string {
	result := ""
	for _, c := range name {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			result += string(c)
		} else if c >= 'A' && c <= 'Z' {
			result += string(c + 32)
		} else if c == ' ' || c == '-' || c == '_' {
			if len(result) > 0 && result[len(result)-1] != '-' {
				result += "-"
			}
		}
	}
	if len(result) > 50 {
		result = result[:50]
	}
	if len(result) == 0 {
		result = "event"
	}
	return result
}
