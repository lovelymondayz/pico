package handler

import (
	"fmt"
	"net/http"
	"pico/internal/config"
	"pico/internal/model"
	"pico/internal/service"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	services *service.Services
	cfg      *config.Config
}

func New(services *service.Services, cfg *config.Config) *Handler {
	return &Handler{
		services: services,
		cfg:      cfg,
	}
}

// --- Auth ---

type RegisterRequest struct {
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6"`
	Name         string `json:"name" binding:"required"`
	BusinessName string `json:"business_name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	user, biz, err := h.services.Business.Register(c.Request.Context(), req.Email, req.Password, req.Name, req.BusinessName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := h.services.Auth.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token":    token,
		"user":     user,
		"business": biz,
	})
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	user, err := h.services.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if !h.services.Auth.CheckPassword(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	token, err := h.services.Auth.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

// --- Public Event Routes ---

func (h *Handler) GetEvent(c *gin.Context) {
	slug := c.Param("slug")
	event, err := h.services.Event.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	if event.Status != "active" {
		c.JSON(http.StatusGone, gin.H{"error": "event is no longer active"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": event})
}

type RegisterGuestRequest struct {
	Name string `json:"name"`
}

func (h *Handler) RegisterGuest(c *gin.Context) {
	slug := c.Param("slug")
	event, err := h.services.Event.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	if event.Status != "active" {
		c.JSON(http.StatusGone, gin.H{"error": "event is no longer active"})
		return
	}

	var req RegisterGuestRequest
	_ = c.ShouldBindJSON(&req)

	guest, token, err := h.services.Guest.RegisterOrGet(c.Request.Context(), event.ID, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register guest"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"guest": guest,
	})
}

func (h *Handler) ListPhotos(c *gin.Context) {
	slug := c.Param("slug")
	event, err := h.services.Event.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	photos, err := h.services.Photo.GetByEvent(c.Request.Context(), event.ID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch photos"})
		return
	}

	total, _ := h.services.Photo.CountByEvent(c.Request.Context(), event.ID)

	c.JSON(http.StatusOK, gin.H{
		"photos": photos,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *Handler) StreamPhotos(c *gin.Context) {
	slug := c.Param("slug")
	event, err := h.services.Event.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	c.SSEvent("connected", gin.H{"event_id": event.ID})

	lastID := 0
	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-time.After(5 * time.Second):
			photos, _ := h.services.Photo.GetByEvent(c.Request.Context(), event.ID, 1, 0)
			if len(photos) > 0 && photos[0].ID > int64(lastID) {
				lastID = int(photos[0].ID)
				c.SSEvent("photo", photos[0])
				c.Writer.Flush()
			}
		}
	}
}

func (h *Handler) UploadPhoto(c *gin.Context) {
	slug := c.Param("slug")
	event, err := h.services.Event.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	if event.Status != "active" {
		c.JSON(http.StatusGone, gin.H{"error": "event is no longer active"})
		return
	}

	guestToken := c.GetHeader("X-Guest-Token")
	if guestToken == "" {
		guestToken = c.Query("token")
	}
	if guestToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "guest token required"})
		return
	}

	guest, err := h.services.Guest.GetByToken(c.Request.Context(), event.ID, guestToken)
	if err != nil {
		guest, guestToken, err = h.services.Guest.RegisterOrGet(c.Request.Context(), event.ID, "")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register guest"})
			return
		}
	}

	eventPhotoCount, _ := h.services.Photo.CountByEvent(c.Request.Context(), event.ID)
	if eventPhotoCount >= event.TotalPhotoLimit {
		c.JSON(http.StatusForbidden, gin.H{"error": "event photo limit reached"})
		return
	}

	if guest.PhotoCount >= event.GuestPhotoLimit {
		c.JSON(http.StatusForbidden, gin.H{"error": fmt.Sprintf("you have reached your upload limit (%d/%d)", guest.PhotoCount, event.GuestPhotoLimit)})
		return
	}

	file, header, err := c.Request.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no photo provided"})
		return
	}
	defer file.Close()

	if header.Size > h.cfg.MaxUploadBytes {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("file too large (max %d MB)", h.cfg.MaxUploadBytes/1024/1024)})
		return
	}

	fileBytes := make([]byte, header.Size)
	if _, err := file.Read(fileBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	photo, err := h.services.Photo.Upload(c.Request.Context(), event.ID, guest.ID, fileBytes, header.Filename, contentType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"photo": photo})
}

func (h *Handler) GetPhoto(c *gin.Context) {
	slug := c.Param("slug")
	id := c.Param("id")

	event, err := h.services.Event.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	photoID, _ := strconv.ParseInt(id, 10, 64)
	photo, err := h.services.Photo.GetByID(c.Request.Context(), photoID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "photo not found"})
		return
	}

	if photo.EventID != event.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "photo does not belong to this event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"photo": photo})
}

// --- Business Routes ---

func (h *Handler) ListBusinessEvents(c *gin.Context) {
	userID := c.GetInt64("userID")
	business, err := h.services.Business.GetByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "business not found"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	events, err := h.services.Event.GetByBusinessID(c.Request.Context(), business.ID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

type CreateEventRequest struct {
	Name            string `json:"name" binding:"required"`
	Description     string `json:"description"`
	StartDate       string `json:"start_date"`
	EndDate         string `json:"end_date"`
	AllowDownloads  bool   `json:"allow_downloads"`
	TotalPhotoLimit int    `json:"total_photo_limit"`
	GuestPhotoLimit int    `json:"guest_photo_limit"`
}

func (h *Handler) CreateEvent(c *gin.Context) {
	userID := c.GetInt64("userID")
	business, err := h.services.Business.GetByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "business not found"})
		return
	}

	var req CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	startDate := time.Now()
	endDate := time.Now().Add(7 * 24 * time.Hour)
	if req.StartDate != "" {
		if d, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			startDate = d
		}
	}
	if req.EndDate != "" {
		if d, err := time.Parse("2006-01-02", req.EndDate); err == nil {
			endDate = d
		}
	}

	slug := fmt.Sprintf("%s-%d", generateSlug(req.Name), time.Now().Unix())

	event, err := h.services.Event.Create(c.Request.Context(), business.ID, req.Name, slug, req.Description, startDate, endDate, req.AllowDownloads, req.TotalPhotoLimit, req.GuestPhotoLimit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"event": event})
}

func (h *Handler) UpdateEvent(c *gin.Context) {
	userID := c.GetInt64("userID")
	eventID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	event, err := h.services.Event.GetByID(c.Request.Context(), eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	business, err := h.services.Business.GetByUserID(c.Request.Context(), userID)
	if err != nil || business.ID != event.BusinessID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	event.Name = req.Name
	event.Description = req.Description
	event.AllowDownloads = req.AllowDownloads
	if req.TotalPhotoLimit > 0 {
		event.TotalPhotoLimit = req.TotalPhotoLimit
	}
	if req.GuestPhotoLimit > 0 {
		event.GuestPhotoLimit = req.GuestPhotoLimit
	}

	if err := h.services.Event.Update(c.Request.Context(), event); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": event})
}

func (h *Handler) CloseEvent(c *gin.Context) {
	userID := c.GetInt64("userID")
	eventID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	event, err := h.services.Event.GetByID(c.Request.Context(), eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	business, err := h.services.Business.GetByUserID(c.Request.Context(), userID)
	if err != nil || business.ID != event.BusinessID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.services.Event.Close(c.Request.Context(), eventID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to close event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "event closed"})
}

func (h *Handler) ListEventPhotos(c *gin.Context) {
	userID := c.GetInt64("userID")
	eventID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	event, err := h.services.Event.GetByID(c.Request.Context(), eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	business, err := h.services.Business.GetByUserID(c.Request.Context(), userID)
	if err != nil || business.ID != event.BusinessID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	photos, err := h.services.Photo.GetByEvent(c.Request.Context(), eventID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch photos"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"photos": photos})
}

func (h *Handler) DownloadPhotos(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not yet implemented"})
}

func (h *Handler) GenerateQR(c *gin.Context) {
	eventID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	event, err := h.services.Event.GetByID(c.Request.Context(), eventID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
		return
	}

	url := fmt.Sprintf("https://%s/e/%s", "pico.arjism.com", event.Slug)
	qrPNG, err := h.services.Photo.GenerateQR(c.Request.Context(), url, 512)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate QR"})
		return
	}

	c.Header("Content-Type", "image/png")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"qr-%s.png\"", event.Slug))
	c.Data(http.StatusOK, "image/png", qrPNG)
}

func (h *Handler) BusinessStats(c *gin.Context) {
	userID := c.GetInt64("userID")
	business, err := h.services.Business.GetByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "business not found"})
		return
	}

	stats, err := h.services.Business.GetStats(c.Request.Context(), business.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch stats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

// --- Admin Routes ---

func (h *Handler) ListPlans(c *gin.Context) {
	plans, err := h.services.Admin.ListPlans(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch plans"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"plans": plans})
}

type PlanRequest struct {
	Name           string  `json:"name" binding:"required"`
	MaxPhotos      int     `json:"max_photos"`
	MaxEvents      int     `json:"max_events"`
	PhotosPerGuest int     `json:"photos_per_guest"`
	MaxStorageMB   int     `json:"max_storage_mb"`
	Price          float64 `json:"price"`
	FeaturesJSON   string  `json:"features_json"`
}

func (h *Handler) CreatePlan(c *gin.Context) {
	var req PlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	plan := &model.Plan{
		Name:           req.Name,
		MaxPhotos:      req.MaxPhotos,
		MaxEvents:      req.MaxEvents,
		PhotosPerGuest: req.PhotosPerGuest,
		MaxStorageMB:   req.MaxStorageMB,
		Price:          req.Price,
		FeaturesJSON:   req.FeaturesJSON,
	}

	created, err := h.services.Admin.CreatePlan(c.Request.Context(), plan)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create plan"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"plan": created})
}

func (h *Handler) UpdatePlan(c *gin.Context) {
	planID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	plan, err := h.services.Admin.GetPlanByID(c.Request.Context(), planID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "plan not found"})
		return
	}

	var req PlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	plan.Name = req.Name
	plan.MaxPhotos = req.MaxPhotos
	plan.MaxEvents = req.MaxEvents
	plan.PhotosPerGuest = req.PhotosPerGuest
	plan.MaxStorageMB = req.MaxStorageMB
	plan.Price = req.Price
	plan.FeaturesJSON = req.FeaturesJSON

	if err := h.services.Admin.UpdatePlan(c.Request.Context(), plan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update plan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"plan": plan})
}

func (h *Handler) DeletePlan(c *gin.Context) {
	planID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.services.Admin.DeletePlan(c.Request.Context(), planID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete plan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "plan deleted"})
}

func (h *Handler) ListAllBusinesses(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	businesses, err := h.services.Admin.ListAllBusinesses(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch businesses"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"businesses": businesses})
}

func (h *Handler) ListAllEvents(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	events, err := h.services.Admin.ListAllEvents(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

func (h *Handler) AdminStats(c *gin.Context) {
	stats, err := h.services.Admin.GetStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch stats"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

func (h *Handler) SuspendBusiness(c *gin.Context) {
	businessID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		Suspended bool `json:"suspended"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if err := h.services.Admin.SuspendBusiness(c.Request.Context(), businessID, req.Suspended); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update business status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "business status updated"})
}

// --- Helpers ---

func (h *Handler) ServePhoto(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid photo id"})
		return
	}

	photo, err := h.services.Photo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "photo not found"})
		return
	}

	fullPath := h.services.GetStorage().GetFullPath(photo.StoragePath)
	c.File(fullPath)
}

func (h *Handler) ServeThumbnail(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid photo id"})
		return
	}

	photo, err := h.services.Photo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "photo not found"})
		return
	}

	fullPath := h.services.GetStorage().GetFullPath(photo.ThumbnailPath)
	c.File(fullPath)
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
